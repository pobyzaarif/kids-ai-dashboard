import { NextRequest, NextResponse } from "next/server";
import { handle, uniqueViolation } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import {
  featureCreateSchema,
  mcpConfigSchema,
} from "@/lib/validators";
import { createFeature, listFeatures } from "@/server/queries/features";

/**
 * GET /api/v1/admin/features?type=builtin|mcp — full catalog incl. inactive
 * rows and (for admins) raw `config` such as MCP endpoint settings.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin(req);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    const features = await listFeatures({
      type: type === "mcp" || type === "builtin" ? type : undefined,
    });
    return NextResponse.json({ features });
  });
}

/** POST /api/v1/admin/features — register a builtin feature or MCP endpoint. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin(req);
    const body = featureCreateSchema.parse(await req.json());

    // MCP endpoints must carry endpoint settings; builtin features get {}.
    const config =
      body.type === "mcp"
        ? mcpConfigSchema.parse(body.config ?? {})
        : (body.config ?? {});

    try {
      const feature = await createFeature({
        code: body.code,
        name: body.name,
        description: body.description || null,
        type: body.type,
        config,
        is_active: body.is_active,
        created_by: admin.id,
      });
      return NextResponse.json({ feature }, { status: 201 });
    } catch (err) {
      uniqueViolation(err, "A feature with this code already exists");
      throw err;
    }
  });
}
