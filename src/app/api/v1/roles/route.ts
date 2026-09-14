import { NextRequest, NextResponse } from "next/server";
import { handle, uniqueViolation } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { roleSchema } from "@/lib/validators";
import {
  createRole,
  listRolesForUser,
  publicRole,
} from "@/server/queries/roles";

/** GET /api/v1/roles — system presets + the caller's own roles. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const roles = await listRolesForUser(user.id);
    return NextResponse.json({ roles: roles.map(publicRole) });
  });
}

/** POST /api/v1/roles — create a private role. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const body = roleSchema.parse(await req.json());

    try {
      const role = await createRole({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        system_prompt: body.system_prompt,
        voice: body.voice,
        temperature: body.temperature,
      });
      return NextResponse.json({ role: publicRole(role) }, { status: 201 });
    } catch (err) {
      uniqueViolation(err, "You already have a role with this name");
      throw err;
    }
  });
}
