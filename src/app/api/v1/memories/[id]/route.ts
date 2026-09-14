import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { memorySchema } from "@/lib/validators";
import {
  deleteMemory,
  getMemoryWithDevice,
  updateMemory,
} from "@/server/queries/memories";

type Params = { params: Promise<{ id: string }> };

async function requireOwnedMemory(id: string, user: { id: string; role: string }) {
  const found = await getMemoryWithDevice(assertUuid(id, "Memory"));
  if (!found || (user.role !== "admin" && found.device_user_id !== user.id)) {
    throw new ApiError(404, "Memory not found");
  }
  return found;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireOwnedMemory(id, user);

    const body = memorySchema.parse(await req.json());
    const memory = await updateMemory(id, body.content);
    return NextResponse.json({ memory });
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireOwnedMemory(id, user);
    await deleteMemory(id);
    return NextResponse.json({ ok: true });
  });
}
