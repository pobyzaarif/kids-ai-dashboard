import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { mcpTestSchema } from "@/lib/validators";
import { getFeatureById } from "@/server/queries/features";
import {
  McpClientError,
  callMcpTool,
  listMcpTools,
  type McpEndpointConfig,
} from "@/server/mcp/client";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin "recall test": talk to a registered MCP endpoint from the console
 * plane (server-side, so CORS never blocks it and auth tokens stay put).
 *
 * Body: `{ action: "list_tools" }` or `{ action: "call_tool", tool, arguments }`.
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    await requireAdmin(req);
    const { id } = await params;
    const feature = await getFeatureById(assertUuid(id, "Feature"));
    if (!feature) throw new ApiError(404, "Feature not found");
    if (feature.type !== "mcp") {
      throw new ApiError(400, "Recall test is only available for MCP features");
    }

    const cfgRaw = feature.config ?? {};
    const endpointUrl =
      typeof cfgRaw.endpoint_url === "string" ? cfgRaw.endpoint_url.trim() : "";
    if (!endpointUrl) {
      throw new ApiError(400, "This MCP feature has no endpoint_url configured");
    }
    const cfg: McpEndpointConfig = {
      endpoint_url: endpointUrl,
      auth_header:
        typeof cfgRaw.auth_header === "string" ? cfgRaw.auth_header : undefined,
      auth_token:
        typeof cfgRaw.auth_token === "string" && cfgRaw.auth_token !== ""
          ? cfgRaw.auth_token
          : undefined,
      timeout_ms: typeof cfgRaw.timeout_ms === "number" ? cfgRaw.timeout_ms : undefined,
    };

    const body = mcpTestSchema.parse(await req.json());
    try {
      if (body.action === "list_tools") {
        const { protocolVersion, serverInfo, tools } = await listMcpTools(cfg);
        return NextResponse.json({ ok: true, protocolVersion, serverInfo, tools });
      }
      const result = await callMcpTool(cfg, body.tool, body.arguments);
      return NextResponse.json({ ok: true, result });
    } catch (err) {
      if (err instanceof McpClientError) {
        throw new ApiError(502, err.message);
      }
      throw err;
    }
  });
}
