import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireDevice } from "@/server/guards";
import { deviceRoleSchema } from "@/lib/validators";
import { setDeviceRole } from "@/server/queries/devices";
import { getRoleById } from "@/server/queries/roles";

type Params = { params: Promise<{ id: string }> };

/** PUT /api/v1/devices/:id/role — configure the AI role on the device. */
export async function PUT(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    const device = await requireDevice(assertUuid(id, "Device"), user);

    const body = deviceRoleSchema.parse(await req.json());

    if (body.role_id) {
      const role = await getRoleById(body.role_id);
      // May assign system presets (user_id IS NULL) or own private roles only.
      if (!role || (role.user_id !== null && role.user_id !== device.user_id)) {
        throw new ApiError(404, "Role not found");
      }
    }

    await setDeviceRole(id, body.role_id);
    return NextResponse.json({ ok: true, role_id: body.role_id });
  });
}
