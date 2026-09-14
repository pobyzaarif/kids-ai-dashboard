import { NextRequest, NextResponse } from "next/server";
import { handle, uniqueViolation } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deviceCreateSchema } from "@/lib/validators";
import {
  createDevice,
  listDevicesByUser,
} from "@/server/queries/devices";

/** GET /api/v1/devices — the caller's devices (newest first). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const devices = await listDevicesByUser(user.id);
    return NextResponse.json({ devices });
  });
}

/** POST /api/v1/devices — bind a new device to the account. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const body = deviceCreateSchema.parse(await req.json());

    try {
      const device = await createDevice({
        user_id: user.id,
        device_code: body.device_code,
        device_name: body.device_name,
        model: body.model || null,
        firmware_version: body.firmware_version || null,
      });
      return NextResponse.json({ device }, { status: 201 });
    } catch (err) {
      uniqueViolation(err, "This device code is already registered");
      throw err;
    }
  });
}
