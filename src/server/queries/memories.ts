import { query } from "@/server/db";

export type MemoryRow = {
  id: string;
  device_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function listMemories(deviceId: string): Promise<MemoryRow[]> {
  return query<MemoryRow>(
    "SELECT * FROM memories WHERE device_id = $1 ORDER BY created_at DESC",
    [deviceId],
  );
}

export async function getMemoryById(id: string): Promise<MemoryRow | null> {
  const rows = await query<MemoryRow>("SELECT * FROM memories WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ?? null;
}

/** Memory joined with its device owner — used for ownership checks. */
export async function getMemoryWithDevice(
  id: string,
): Promise<{ memory: MemoryRow; device_user_id: string } | null> {
  const rows = await query<MemoryRow & { device_user_id: string }>(
    `SELECT m.*, d.user_id AS device_user_id
     FROM memories m JOIN devices d ON d.id = m.device_id
     WHERE m.id = $1 LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const { device_user_id, ...memory } = row;
  return { memory, device_user_id };
}

export async function countMemories(deviceId: string): Promise<number> {
  const rows = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM memories WHERE device_id = $1",
    [deviceId],
  );
  return rows[0].count;
}

export async function createMemory(deviceId: string, content: string): Promise<MemoryRow> {
  const rows = await query<MemoryRow>(
    "INSERT INTO memories (device_id, content) VALUES ($1, $2) RETURNING *",
    [deviceId, content],
  );
  return rows[0];
}

export async function updateMemory(id: string, content: string): Promise<MemoryRow | null> {
  const rows = await query<MemoryRow>(
    "UPDATE memories SET content = $2 WHERE id = $1 RETURNING *",
    [id, content],
  );
  return rows[0] ?? null;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "DELETE FROM memories WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}
