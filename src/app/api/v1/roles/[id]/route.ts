import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertUuid, handle, uniqueViolation } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { roleUpdateSchema } from "@/lib/validators";
import {
  deleteRole,
  getRoleById,
  publicRole,
  updateRole,
} from "@/server/queries/roles";

type Params = { params: Promise<{ id: string }> };

async function requireEditableRole(id: string, user: { id: string; role: string }) {
  const role = await getRoleById(assertUuid(id, "Role"));
  if (!role) throw new ApiError(404, "Role not found");
  // System presets are admin-only; private roles are owner-only.
  if (role.user_id === null ? user.role !== "admin" : role.user_id !== user.id) {
    throw new ApiError(404, "Role not found");
  }
  return role;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireEditableRole(id, user);

    const body = roleUpdateSchema.parse(await req.json());
    try {
      const role = await updateRole(id, {
        name: body.name,
        description: body.description ?? undefined,
        system_prompt: body.system_prompt,
        voice: body.voice,
        temperature: body.temperature,
      });
      return NextResponse.json({ role: role ? publicRole(role) : null });
    } catch (err) {
      uniqueViolation(err, "You already have a role with this name");
      throw err;
    }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireEditableRole(id, user);
    await deleteRole(id); // devices referencing it fall back to role_id = NULL
    return NextResponse.json({ ok: true });
  });
}
