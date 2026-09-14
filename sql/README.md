# SQL — Schema, Seeders & Data Dictionary

This folder is the **single source of truth** for the console database. No ORM
migrations — plain, idempotent SQL applied by `npm run db:init` (or `psql`).

## Files (apply in order)

| File              | Purpose                                                             | Idempotent |
| ----------------- | ------------------------------------------------------------------- | ---------- |
| `0001_schema.sql` | All tables, indexes, constraints, `updated_at` triggers             | ✅ re-runnable |
| `0002_seed.sql`   | Seeders: admin + demo users, system roles, feature catalog, settings, demo device | ✅ re-runnable |

```bash
npm run db:init   # apply schema + seed
npm run db:seed   # re-apply seed only
```

## Entity relationships

```
users (admin|user)
  ├── roles            1:N   (NULL user_id = system preset, shared)
  ├── devices          1:N   (bound device, unique device_code)
  │     ├── roles      N:1   (role configured on the device)
  │     ├── memories   1:N   (long-term memory CRUD)
  │     └── device_features  N:M via features (per-device activation)
  └── settings         (updated_by audit only)
```

## Table dictionary

### `users`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `email` | text | unique case-insensitively (`lower(email)` index) |
| `password_hash` | text | bcrypt, cost 10 |
| `display_name` | text | shown in the console topbar |
| `role` | text | `admin` \| `user`. Admins manage the feature catalog + MCP endpoints |
| `status` | text | `active` \| `suspended` — suspended blocks login & all API calls |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-bumped by trigger |

### `roles` — AI persona configured onto a device
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid nullable | `NULL` = system preset (shared, read-only for users) |
| `name` | text | unique per scope (system: global; private: per owner) |
| `description` | text | |
| `system_prompt` | text | injected as LLM system prompt by the device plane |
| `voice` | text | TTS voice label for the device plane |
| `temperature` | numeric(3,2) | 0.00–2.00 |
| `is_default` | boolean | preset flag |

### `devices`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK→users | owner; cascade delete |
| `device_code` | text | hardware id, unique (Kido `Device-Id`, usually MAC) |
| `device_name` | text | friendly label |
| `model` / `firmware_version` | text | optional hardware metadata |
| `role_id` | uuid FK→roles | current AI role; `ON DELETE SET NULL` |
| `status` | text | `active` \| `disabled` |
| `last_online_at` | timestamptz | device-plane heartbeat (null until first seen) |

### `features` — activation catalog (incl. admin MCP endpoints)
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `code` | text | unique slug, e.g. `kb_search`, `mcp_tools_demo` |
| `name` / `description` | text | |
| `type` | text | `builtin` \| `mcp` |
| `config` | jsonb | for `mcp`: `{ endpoint_url, auth_header, auth_token, timeout_ms }`. **Secret-bearing — admin API only** |
| `is_active` | boolean | master switch; inactive features can't be enabled on devices |
| `created_by` | uuid FK→users | admin who registered it |

### `device_features`
| Column | Type | Notes |
| --- | --- | --- |
| `device_id`, `feature_id` | PK pair | FKs cascade on delete |
| `enabled` | boolean | activation state ("activate feature") |
| `config` | jsonb | optional per-device override |
| `enabled_at` | timestamptz | set when toggled on |

### `memories`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `device_id` | uuid FK→devices | cascade delete with device |
| `content` | text | a single remembered fact (≤1000 chars enforced in API) |

### `settings`
| Column | Type | Notes |
| --- | --- | --- |
| `key` | text PK | dotted key, e.g. `console.site_name` |
| `value` | jsonb | any JSON value |
| `updated_by` | uuid FK→users | audit |

Known keys (validated by `PUT /api/v1/admin/settings`):

| Key | Type | Default | Purpose |
| --- | --- | --- | --- |
| `console.site_name` | string | `"Kids AI Console"` | Branding in the shell |
| `console.max_memories_per_device` | number 1–1000 | `100` | Enforced by memory-create API |
| `mcp.default_timeout_ms` | number | `30000` | Device-plane default MCP timeout |

## Seeders inventory (`0002_seed.sql`)

| What | Rows | Notes |
| --- | --- | --- |
| Users | `admin@kids-ai.local` / `admin123` (admin), `user@kids-ai.local` / `user123` (user) | bcrypt hashes pre-computed; **change before any real deployment** |
| System roles | `Storyteller`, `Tutor`, `Buddy` | `user_id IS NULL`, ready to assign to devices |
| Features (builtin) | `memory`, `kb_search`, `story_mode`, `bedtime_mode` | `bedtime_mode` ships inactive to demo the admin activation flow |
| Features (mcp) | `mcp_tools_demo` | Example MCP endpoint entry, inactive by default |
| Settings | the three known keys above | |
| Demo device | `Nursery Speaker` (`AA:BB:CC:DD:EE:01`) for the demo user | Storyteller role, `memory` feature enabled, 2 sample memories |

Seed rows are keyed by their unique constraints (`ON CONFLICT ... DO NOTHING`),
so re-running never duplicates or overwrites edits made through the console.

## Verification queries

```bash
psql -d kids_ai_db -c '\dt'                        # list tables
psql -d kids_ai_db -c 'SELECT email, role FROM users;'
psql -d kids_ai_db -c 'SELECT code, type, is_active FROM features;'
```

## kids-ai-be (Go backend) alignment

Table/column names mirror the `kids-ai-be` plan (`users`, `devices`,
`roles`≈`personas`, `memories`, pairing flow noted on `devices`). When the Go
backend's console plane matures, the Next.js app can be re-pointed at it by
swapping the `src/server/queries/*` modules for HTTP calls — page and REST
shapes (`/api/v1/...`) were kept intentionally compatible.
