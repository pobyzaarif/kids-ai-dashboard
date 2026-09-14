import { Pool } from "pg";
import { config } from "@/lib/config";

declare global {
  // Cached across HMR reloads in dev to avoid pool churn.
  var __kidsDashboardPool: Pool | undefined;
}

export const pool =
  globalThis.__kidsDashboardPool ??
  new Pool({ connectionString: config.databaseUrl, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__kidsDashboardPool = pool;
}

/** Runs a parameterized query and returns all rows. */
export async function query<T>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params as unknown[]);
  return result.rows as T[];
}
