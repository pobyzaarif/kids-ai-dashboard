import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listFeatures, sanitizeFeature } from "@/server/queries/features";

/** GET /api/v1/features — active catalog (config sanitized for non-admins). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const isAdmin = user.role === "admin";
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    const features = await listFeatures({
      type: type === "mcp" || type === "builtin" ? type : undefined,
      activeOnly: !isAdmin,
    });
    return NextResponse.json({ features: features.map((f) => sanitizeFeature(f, isAdmin)) });
  });
}
