import { z } from "zod";

/* --------------------------------- auth ---------------------------------- */

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
  display_name: z.string().trim().min(1, "Display name is required").max(50),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1, "Password is required").max(72),
});

/* -------------------------------- devices -------------------------------- */

export const deviceCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    /^[A-Za-z0-9_\-.:]+$/,
    "Use letters, digits, dashes, dots, colons or underscores",
  );

export const deviceCreateSchema = z.object({
  device_name: z.string().trim().min(1, "Device name is required").max(60),
  device_code: deviceCodeSchema,
  model: z.string().trim().max(60).optional(),
  firmware_version: z.string().trim().max(30).optional(),
});

export const deviceUpdateSchema = z.object({
  device_name: z.string().trim().min(1).max(60).optional(),
  model: z.string().trim().max(60).optional(),
  firmware_version: z.string().trim().max(30).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const deviceRoleSchema = z.object({
  role_id: z.string().uuid().nullable(),
});

/* --------------------------------- roles --------------------------------- */

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(500).optional(),
  system_prompt: z.string().max(4000).default(""),
  voice: z.string().trim().max(60).default("default"),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const roleUpdateSchema = roleSchema.partial();

/* -------------------------------- memories ------------------------------- */

export const memorySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(1000, "Keep memories under 1000 characters"),
});

/* ------------------------- features (incl. MCP) -------------------------- */

export const mcpConfigSchema = z.object({
  endpoint_url: z.string().trim().url("Endpoint must be a valid URL").max(500),
  auth_header: z.string().trim().max(60).default("Authorization"),
  auth_token: z.string().max(500).default(""),
  timeout_ms: z.number().int().min(1000).max(300000).default(30000),
});

export const featureCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Code must be lowercase snake_case, e.g. weather_tools",
    ),
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300).optional(),
  type: z.enum(["builtin", "mcp"]),
  config: z.record(z.unknown()).optional(),
  is_active: z.boolean().default(true),
});

/** `code` is immutable once created (device bindings reference it). */
export const featureUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export const toggleFeatureSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Admin MCP "recall test" — either list the tools a registered endpoint
 * exposes (`tools/list`) or invoke one of them (`tools/call`).
 */
export const mcpTestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list_tools") }),
  z.object({
    action: z.literal("call_tool"),
    tool: z.string().trim().min(1, "Tool name is required").max(200),
    arguments: z.record(z.unknown()).default({}),
  }),
]);

/* -------------------------------- settings ------------------------------- */

import { ApiError } from "@/lib/api";

/* ------------------------- known settings registry ------------------------ */

export const settingsUpdateSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9_.]{1,60}$/),
        value: z.unknown(),
      }),
    )
    .min(1)
    .max(20),
});

export const KNOWN_SETTINGS: Record<string, z.ZodType> = {
  "console.site_name": z.string().trim().min(1).max(60),
  "console.max_memories_per_device": z.number().int().min(1).max(1000),
  "mcp.default_timeout_ms": z.number().int().min(1000).max(300000),
};

/** Validates a settings value against its known-key schema (throws ApiError). */
export function validateSetting(key: string, value: unknown): unknown {
  const schema = KNOWN_SETTINGS[key];
  if (!schema) {
    throw new ApiError(400, `Unknown setting key "${key}"`);
  }
  return schema.parse(value);
}
