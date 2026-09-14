import { query } from "@/server/db";

export type DeviceStatus = "active" | "disabled";

export type DeviceRow = {
  id: string;
  user_id: string;
  device_code: string;
  device_name: string;
  model: string | null;
  firmware_version: string | null;
  role_id: string | null;
  status: DeviceStatus;
  last_online_at: string | null;
  bound_at: string;
  created_at: string;
  updated_at: string;
};

export type DeviceWithMeta = DeviceRow & {
  role_name: string | null;
  role_voice: string | null;
  owner_email: string;
  memory_count: number;
  enabled_features: number;
};

const BASE_SELECT = `
  SELECT d.*,
         r.name AS role_name,
         r.voice AS role_voice,
         u.email AS owner_email,
         (SELECT count(*)::int FROM memories m WHERE m.device_id = d.id) AS memory_count,
         (SELECT count(*)::int FROM device_features df
           WHERE df.device_id = d.id AND df.enabled) AS enabled_features
  FROM devices d
  LEFT JOIN roles r ON r.id = d.role_id
  JOIN users u ON u.id = d.user_id
`;

export async function listDevicesByUser(userId: string): Promise<DeviceWithMeta[]> {
  return query<DeviceWithMeta>(
    `${BASE_SELECT} WHERE d.user_id = $1 ORDER BY d.created_at DESC`,
    [userId],
  );
}

export async function getDeviceById(id: string): Promise<DeviceWithMeta | null> {
  const rows = await query<DeviceWithMeta>(
    `${BASE_SELECT} WHERE d.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createDevice(input: {
  user_id: string;
  device_code: string;
  device_name: string;
  model: string | null;
  firmware_version: string | null;
}): Promise<DeviceRow> {
  const rows = await query<DeviceRow>(
    `INSERT INTO devices (user_id, device_code, device_name, model, firmware_version)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.user_id, input.device_code, input.device_name, input.model, input.firmware_version],
  );
  return rows[0];
}

export async function updateDevice(
  id: string,
  patch: { device_name?: string; model?: string | null; firmware_version?: string | null; status?: DeviceStatus },
): Promise<DeviceRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) return getDeviceById(id);
  params.push(id);
  const rows = await query<DeviceRow>(
    `UPDATE devices SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function setDeviceRole(
  id: string,
  roleId: string | null,
): Promise<DeviceRow | null> {
  const rows = await query<DeviceRow>(
    "UPDATE devices SET role_id = $2 WHERE id = $1 RETURNING *",
    [id, roleId],
  );
  return rows[0] ?? null;
}

export async function deleteDevice(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "DELETE FROM devices WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}
