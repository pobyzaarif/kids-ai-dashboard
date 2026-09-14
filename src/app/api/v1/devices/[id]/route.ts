import { NextRequest, NextResponse } from "next/server";
import { assertUuid, handle, uniqueViolation } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireDevice } from "@/server/guards";
import { deviceUpdateSchema } from "@/lib/validators";
import {
  deleteDevice,
  getDeviceById,
  updateDevice,
} from "@/server/queries/devices";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireDevice(assertUuid(id, "Device"), user);
    const device = await getDeviceById(id);
    return NextResponse.json({ device });
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireDevice(assertUuid(id, "Device"), user);

    const body = deviceUpdateSchema.parse(await req.json());
    try {
      const device = await updateDevice(id, {
        device_name: body.device_name,
        model: body.model === undefined ? undefined : body.model || null,
        firmware_version:
          body.firmware_version === undefined
            ? undefined
            : body.firmware_version || null,
        status: body.status,
      });
      return NextResponse.json({ device: device ?? (await getDeviceById(id)) });
    } catch (err) {
      uniqueViolation(err, "This device code is already registered");
      throw err;
    }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireDevice(assertUuid(id, "Device"), user);
    await deleteDevice(id);
    return NextResponse.json({ ok: true });
  });
}
