import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle, uniqueViolation } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import {
  featureUpdateSchema,
  mcpConfigSchema,
} from "@/lib/validators";
import {
  deleteFeature,
  getFeatureById,
  updateFeature,
} from "@/server/queries/features";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    await requireAdmin(req);
    const { id } = await params;
    const existing = await getFeatureById(assertUuid(id, "Feature"));
    if (!existing) throw new ApiError(404, "Feature not found");

    const body = featureUpdateSchema.parse(await req.json());

    // MCP config is a partial merge over the stored value — fields the admin
    // leaves out (e.g. auth_token in the edit dialog) are preserved.
    let config: Record<string, unknown> | undefined;
    if (body.config !== undefined && existing.type === "mcp") {
      const partial = mcpConfigSchema.partial().parse(body.config);
      config = { ...existing.config, ...partial };
    } else if (body.config !== undefined) {
      config = body.config;
    }

    try {
      const feature = await updateFeature(id, {
        name: body.name,
        description: body.description ?? undefined,
        config,
        is_active: body.is_active,
      });
      return NextResponse.json({ feature });
    } catch (err) {
      uniqueViolation(err, "A feature with this code already exists");
      throw err;
    }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handle(async () => {
    await requireAdmin(req);
    const { id } = await params;
    const existing = await getFeatureById(assertUuid(id, "Feature"));
    if (!existing) throw new ApiError(404, "Feature not found");
    // Cascades: any device_features rows are removed with it.
    await deleteFeature(id);
    return NextResponse.json({ ok: true });
  });
}
