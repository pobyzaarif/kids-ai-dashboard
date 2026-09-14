import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireDevice } from "@/server/guards";
import { toggleFeatureSchema } from "@/lib/validators";
import {
  getFeatureById,
  setDeviceFeature,
} from "@/server/queries/features";

type Params = { params: Promise<{ id: string; featureId: string }> };

/** PUT /api/v1/devices/:id/features/:featureId — activate/deactivate a feature. */
export async function PUT(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id, featureId } = await params;
    await requireDevice(assertUuid(id, "Device"), user);

    const body = toggleFeatureSchema.parse(await req.json());

    const feature = await getFeatureById(assertUuid(featureId, "Feature"));
    if (!feature) throw new ApiError(404, "Feature not found");
    if (body.enabled && !feature.is_active) {
      throw new ApiError(
        409,
        "This feature is inactive in the catalog — ask an admin to activate it first",
      );
    }

    await setDeviceFeature(id, featureId, body.enabled);
    return NextResponse.json({
      ok: true,
      feature_id: featureId,
      enabled: body.enabled,
    });
  });
}
