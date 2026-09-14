import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireDevice } from "@/server/guards";
import { memorySchema } from "@/lib/validators";
import { getSettings } from "@/server/queries/settings";
import {
  countMemories,
  createMemory,
  listMemories,
} from "@/server/queries/memories";

type Params = { params: Promise<{ id: string }> };

const DEFAULT_MAX_MEMORIES = 100;

export async function GET(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireDevice(assertUuid(id, "Device"), user);
    const memories = await listMemories(id);
    return NextResponse.json({ memories });
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireDevice(assertUuid(id, "Device"), user);

    const body = memorySchema.parse(await req.json());

    const settings = await getSettings();
    const max =
      typeof settings["console.max_memories_per_device"] === "number"
        ? (settings["console.max_memories_per_device"] as number)
        : DEFAULT_MAX_MEMORIES;

    const count = await countMemories(id);
    if (count >= max) {
      throw new ApiError(
        400,
        `Memory limit reached: ${max} memories per device (admin-adjustable in Settings)`,
      );
    }

    const memory = await createMemory(id, body.content);
    return NextResponse.json({ memory }, { status: 201 });
  });
}
