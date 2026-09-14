import { query } from "@/server/db";

export type RoleRow = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  system_prompt: string;
  voice: string;
  /** numeric(3,2) in Postgres; normalized to number by the query layer. */
  temperature: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type RoleWithMeta = RoleRow & {
  is_system: boolean;
  device_count: number;
};

/** numeric(3,2) arrives as a string — normalize to number at the boundary. */
function withNumberTemperature<T extends RoleRow>(role: T): T {
  return { ...role, temperature: Number(role.temperature) };
}

export async function listRolesForUser(userId: string): Promise<RoleWithMeta[]> {
  // System presets first, then the user's own roles; both show usage counts.
  const rows = await query<RoleWithMeta>(
    `SELECT r.*,
            (r.user_id IS NULL) AS is_system,
            (SELECT count(*)::int FROM devices d WHERE d.role_id = r.id) AS device_count
     FROM roles r
     WHERE r.user_id IS NULL OR r.user_id = $1
     ORDER BY (r.user_id IS NULL) DESC, r.created_at ASC`,
    [userId],
  );
  return rows.map(withNumberTemperature);
}

export async function getRoleById(id: string): Promise<RoleRow | null> {
  const rows = await query<RoleRow>("SELECT * FROM roles WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ? withNumberTemperature(rows[0]) : null;
}

export async function createRole(input: {
  user_id: string | null;
  name: string;
  description: string | null;
  system_prompt: string;
  voice: string;
  temperature: number;
  is_default?: boolean;
}): Promise<RoleRow> {
  const rows = await query<RoleRow>(
    `INSERT INTO roles (user_id, name, description, system_prompt, voice, temperature, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.user_id,
      input.name,
      input.description,
      input.system_prompt,
      input.voice,
      input.temperature,
      input.is_default ?? false,
    ],
  );
  return withNumberTemperature(rows[0]);
}

export async function updateRole(
  id: string,
  patch: { name?: string; description?: string | null; system_prompt?: string; voice?: string; temperature?: number },
): Promise<RoleRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) return getRoleById(id);
  params.push(id);
  const rows = await query<RoleRow>(
    `UPDATE roles SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ? withNumberTemperature(rows[0]) : null;
}

export async function deleteRole(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "DELETE FROM roles WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}

/** Kept for API parity — rows are already normalized at the query boundary. */
export function publicRole(role: RoleRow) {
  return { ...role, temperature: Number(role.temperature) };
}
