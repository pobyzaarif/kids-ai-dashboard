import { query } from "@/server/db";

/** Returns all settings as a flat map `{ key: value }`. */
export async function getSettings(): Promise<Record<string, unknown>> {
  const rows = await query<{ key: string; value: unknown }>(
    "SELECT key, value FROM settings",
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const rows = await query<{ value: T }>(
    "SELECT value FROM settings WHERE key = $1 LIMIT 1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function upsertSetting(
  key: string,
  value: unknown,
  updatedBy: string | null,
): Promise<void> {
  await query(
    `INSERT INTO settings (key, value, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
    [key, JSON.stringify(value), updatedBy],
  );
}
