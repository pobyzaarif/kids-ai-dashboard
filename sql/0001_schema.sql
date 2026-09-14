-- =============================================================================
-- kids-ai-dashboard — Console schema
-- -----------------------------------------------------------------------------
-- Self-contained data model for the user console (dashboard):
-- users -> devices -> roles / memories / features, plus admin settings.
--
-- Design rules:
--   * Idempotent: safe to re-run on every deploy (npm run db:init).
--   * Raw SQL is the single source of truth (no ORM migrations).
--   * Table/column names intentionally match the kids-ai-be (Go) plan so the
--     console can later be pointed at the Go backend with minimal renaming.
--   * Requires PostgreSQL >= 13 (gen_random_uuid built-in). No extensions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users — parents/admins who log into the console.
--   role:   'admin' manages features/settings (incl. MCP endpoints) for everyone;
--           'user' manages only their own devices/roles/memories.
--   status: 'suspended' blocks login and every authenticated API call.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  password_hash text NOT NULL,               -- bcrypt, cost 10
  display_name  text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on email (functional unique index).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- -----------------------------------------------------------------------------
-- roles — the AI "role"/persona that can be configured onto a device.
--   user_id IS NULL  -> system preset (read-only for regular users, seeded).
--   user_id = uuid   -> private role owned by that user.
--   system_prompt    -> injected as the LLM system prompt on the device.
--   voice/temperature-> per-role TTS voice label and sampling temperature.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  system_prompt text NOT NULL DEFAULT '',
  voice         text NOT NULL DEFAULT 'default',
  temperature   numeric(3, 2) NOT NULL DEFAULT 0.70 CHECK (temperature >= 0 AND temperature <= 2),
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- System presets: unique name among NULL-owner rows.
CREATE UNIQUE INDEX IF NOT EXISTS roles_system_name_uk ON roles (lower(name)) WHERE user_id IS NULL;
-- Private roles: unique name per owner.
CREATE UNIQUE INDEX IF NOT EXISTS roles_user_name_uk ON roles (user_id, lower(name)) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS roles_user_idx ON roles (user_id);

-- -----------------------------------------------------------------------------
-- devices — a voice device (ESP32-class, xiaozhi protocol) bound to a user.
--   device_code: stable hardware id ("Device-Id" in the xiaozhi protocol,
--                usually a MAC address); unique across all accounts.
--   role_id:     the AI role currently configured on this device.
--   status:      'disabled' devices are rejected by the device plane.
-- NOTE: pairing-code flow (6-digit, TTL, single-use) is a device-plane
--       extension and will live in a `pairing_codes` table; v1 binds devices
--       from this console via a form.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_code      text NOT NULL,
  device_name      text NOT NULL,
  model            text,
  firmware_version text,
  role_id          uuid REFERENCES roles(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_online_at   timestamptz,             -- maintained by the device plane (heartbeat)
  bound_at         timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS devices_device_code_uk ON devices (lower(device_code));
CREATE INDEX IF NOT EXISTS devices_user_idx ON devices (user_id);

-- -----------------------------------------------------------------------------
-- features — activation catalog. One row per feature the console can enable.
--   type 'builtin': console-native capability (memory, kb_search, story_mode...).
--   type 'mcp':     an MCP (Model Context Protocol) endpoint the admin registers;
--                   `config` carries the endpoint settings:
--                     { endpoint_url, auth_header, auth_token, timeout_ms }
--                   Only admins may read/write `config` (contains secrets).
--   is_active:      master switch — inactive features cannot be enabled on
--                   any device until an admin activates them.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,                -- stable slug, e.g. 'kb_search'
  name        text NOT NULL,
  description text,
  type        text NOT NULL DEFAULT 'builtin' CHECK (type IN ('builtin', 'mcp')),
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS features_code_uk ON features (lower(code));

-- -----------------------------------------------------------------------------
-- device_features — per-device feature activation ("activate feature").
--   enabled: whether the device should advertise/use this feature.
--   config:  optional per-device override on top of features.config.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_features (
  device_id  uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL DEFAULT false,
  config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, feature_id)
);

-- -----------------------------------------------------------------------------
-- memories — long-term memory the assistant should remember about a device's
-- child (console "memory" panel). Plain text for the MVP; embedding
-- columns are a device-plane extension (pgvector lives in kids-kb today).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_device_idx ON memories (device_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- settings — global admin settings, key/value with JSON values.
-- Known keys (see sql/README.md):
--   console.site_name                 string
--   console.max_memories_per_device   number
--   mcp.default_timeout_ms            number
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- updated_at maintenance — auto-bump updated_at on every UPDATE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS roles_updated_at ON roles;
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS devices_updated_at ON devices;
CREATE TRIGGER devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS features_updated_at ON features;
CREATE TRIGGER features_updated_at BEFORE UPDATE ON features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS device_features_updated_at ON device_features;
CREATE TRIGGER device_features_updated_at BEFORE UPDATE ON device_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS memories_updated_at ON memories;
CREATE TRIGGER memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
