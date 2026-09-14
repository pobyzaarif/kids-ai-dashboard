import { query } from "@/server/db";

export type FeatureType = "builtin" | "mcp";

export type FeatureRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: FeatureType;
  config: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DeviceFeatureRow = FeatureRow & {
  enabled: boolean;
  enabled_at: string | null;
  device_config: Record<string, unknown>;
};

export async function listFeatures(options: {
  type?: FeatureType;
  activeOnly?: boolean;
} = {}): Promise<FeatureRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.type) {
    params.push(options.type);
    conditions.push(`type = $${params.length}`);
  }
  if (options.activeOnly) {
    conditions.push("is_active = true");
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<FeatureRow>(
    `SELECT * FROM features ${where} ORDER BY type ASC, code ASC`,
    params,
  );
}

export async function getFeatureById(id: string): Promise<FeatureRow | null> {
  const rows = await query<FeatureRow>("SELECT * FROM features WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function createFeature(input: {
  code: string;
  name: string;
  description: string | null;
  type: FeatureType;
  config: Record<string, unknown>;
  is_active: boolean;
  created_by: string;
}): Promise<FeatureRow> {
  const rows = await query<FeatureRow>(
    `INSERT INTO features (code, name, description, type, config, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) RETURNING *`,
    [input.code, input.name, input.description, input.type, JSON.stringify(input.config), input.is_active, input.created_by],
  );
  return rows[0];
}

export async function updateFeature(
  id: string,
  patch: { name?: string; description?: string | null; config?: Record<string, unknown>; is_active?: boolean },
): Promise<FeatureRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    params.push(column === "config" ? JSON.stringify(value) : value);
    sets.push(`${column} = $${params.length}${column === "config" ? "::jsonb" : ""}`);
  }
  if (sets.length === 0) return getFeatureById(id);
  params.push(id);
  const rows = await query<FeatureRow>(
    `UPDATE features SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function deleteFeature(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "DELETE FROM features WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}

/** Catalog joined with per-device activation state. */
export async function listFeaturesForDevice(deviceId: string): Promise<DeviceFeatureRow[]> {
  return query<DeviceFeatureRow>(
    `SELECT f.*, df.enabled, df.enabled_at, COALESCE(df.config, '{}'::jsonb) AS device_config
     FROM features f
     LEFT JOIN device_features df ON df.feature_id = f.id AND df.device_id = $1
     WHERE f.is_active
     ORDER BY f.type ASC, f.code ASC`,
    [deviceId],
  );
}

export async function setDeviceFeature(
  deviceId: string,
  featureId: string,
  enabled: boolean,
): Promise<void> {
  await query(
    `INSERT INTO device_features (device_id, feature_id, enabled, enabled_at)
     VALUES ($1, $2, $3, CASE WHEN $3 THEN now() ELSE NULL END)
     ON CONFLICT (device_id, feature_id) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           enabled_at = EXCLUDED.enabled_at,
           updated_at = now()`,
    [deviceId, featureId, enabled],
  );
}

/**
 * Non-admins must never see feature `config` (mcp auth tokens live there).
 * They get the endpoint URL/timeout for display plus a has-token flag.
 */
export function sanitizeFeature(feature: FeatureRow, isAdmin: boolean) {
  if (isAdmin) return feature;
  const cfg = feature.config ?? {};
  return {
    ...feature,
    config:
      feature.type === "mcp"
        ? {
            endpoint_url: typeof cfg.endpoint_url === "string" ? cfg.endpoint_url : null,
            timeout_ms: typeof cfg.timeout_ms === "number" ? cfg.timeout_ms : null,
          }
        : {},
    has_auth_token: feature.type === "mcp" && Boolean(cfg.auth_token),
  };
}
