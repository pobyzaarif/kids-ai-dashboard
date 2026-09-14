# Kids AI Console (kids-ai-dashboard)

A **Management console** for kids' AI voice companions, built as a
self-contained full-stack **Next.js** app with a **neobrutalism** UI.

Parents sign up / log in, bind their voice devices, configure an AI **role**
(persona) on each device, curate long-term **memories**, and **activate
features** per device. Admins manage the global **feature catalog**, register
**MCP endpoints**, and adjust console-wide settings.

## Features

| Role | Capability |
| --- | --- |
| User (parent) | Signup / login (JWT session cookie) |
| | Add devices (Kido `Device-Id`), edit/disable/delete |
| | Configure the AI role on each device (system presets or private roles) |
| | CRUD long-term memories per device (limit enforced from settings) |
| | Activate/deactivate features per device (Toggle) |
| Admin | Feature catalog CRUD (builtin + MCP endpoint entries with URL/auth/timeout) |
| | MCP endpoint settings (`endpoint_url`, `auth_header`, `auth_token`, `timeout_ms`) — tokens are masked for regular users |
| | Global settings: site name, max memories per device, default MCP timeout |

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC + Route Handlers) + TypeScript |
| Database | PostgreSQL (raw SQL via `pg`, no ORM) |
| Auth | bcryptjs + JWT (`jose`) in an httpOnly cookie, edge middleware guards |
| Validation | zod on every API input |
| Styling | Tailwind CSS v4 + hand-rolled neobrutalism kit (thick borders, hard shadows, bold colors) |

## Quickstart

```bash
# 1. Database (PostgreSQL >= 13)
createdb kids_ai_db

# 2. Environment
cp .env.example .env         # set DATABASE_URL + JWT_SECRET (openssl rand -hex 32)

# 3. Install + apply schema & seeders
npm install
npm run db:init              # applies sql/0001_schema.sql + sql/0002_seed.sql (idempotent)

# 4. Run
npm run dev                  # http://localhost:3000
```

### Seeded accounts (dev only)

| Email | Password | Role |
| --- | --- | --- |
| `admin@kids-ai.local` | `admin123` | admin |
| `user@kids-ai.local` | `user123` | user (owns demo device "Nursery Speaker") |

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:init` | Apply schema + seeders (idempotent) |
| `npm run db:seed` | Re-apply seeders only |

## Pages

| Route | Description |
| --- | --- |
| `/` | Neobrutalist landing page |
| `/login`, `/signup` | Auth (redirects to console when logged in) |
| `/dashboard` | Overview: device/role/memory/feature stat cards + quick start |
| `/devices` | Device grid + **Add Device** dialog |
| `/devices/[id]` | Device detail with tabs: **Role** (assign persona), **Memory** (CRUD), **Features** (toggle) + edit/disable/delete |
| `/roles` | Role manager: private roles CRUD + read-only system presets |
| `/admin/settings` | Admin-only: **MCP Endpoints**, **Feature Catalog**, **General** settings |

## REST API (console plane, `/api/v1`)

All responses are JSON. Errors: `{ error, details? }` with proper status codes
(401 unauthenticated, 403 forbidden/suspended, 404 not-found/foreign, 409
conflict, 422 validation). Cookie: `kids_session` (httpOnly JWT).

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/auth/signup` | `{ email, password, display_name }` → 201 + session |
| POST | `/api/v1/auth/login` | → session cookie |
| POST | `/api/v1/auth/logout` | clears cookie |
| GET | `/api/v1/auth/me` | current user |
| GET/POST | `/api/v1/devices` | list own / add device |
| GET/PATCH/DELETE | `/api/v1/devices/:id` | detail / edit / delete (owner or admin) |
| PUT | `/api/v1/devices/:id/role` | `{ role_id: string \| null }` |
| GET/POST | `/api/v1/devices/:id/memories` | list / add (max-memories enforced) |
| PATCH/DELETE | `/api/v1/memories/:id` | edit / delete memory |
| PUT | `/api/v1/devices/:id/features/:featureId` | `{ enabled: boolean }` |
| GET | `/api/v1/roles` | system presets + own |
| POST | `/api/v1/roles` | create private role |
| PATCH/DELETE | `/api/v1/roles/:id` | own private roles (admins may edit presets) |
| GET | `/api/v1/features` | active catalog (`config` sanitized for non-admins) |
| GET/POST | `/api/v1/admin/features` | admin: full catalog incl. MCP config |
| PATCH/DELETE | `/api/v1/admin/features/:id` | admin: edit (partial config merge) / delete |
| GET/PUT | `/api/v1/admin/settings` | admin: known-key settings with type checking |

## Project structure

```
kids-ai-dashboard/
├── sql/                      # DDL + seeders + data dictionary (source of truth)
├── scripts/db-init.ts        # idempotent SQL applier (db:init / db:seed)
├── src/
│   ├── middleware.ts         # edge guards for /dashboard & /admin
│   ├── app/
│   │   ├── page.tsx          # landing
│   │   ├── login/ · signup/  # auth pages + client forms
│   │   ├── (console)/        # authenticated shell (sidebar layout)
│   │   │   ├── dashboard/ · devices/ · roles/
│   │   │   └── admin/settings/
│   │   └── api/v1/           # REST console plane (auth, devices, roles,
│   │                         #   memories, features, admin)
│   ├── components/
│   │   ├── ui/               # neobrutalism kit (Button, Card, Dialog, Toggle…)
│   │   ├── console/          # shell, device cards/panels, role manager
│   │   └── admin/            # admin settings + feature/MCP dialog
│   ├── lib/                  # config, auth (JWT/cookies), validators, api helpers
│   └── server/               # pg pool, queries/* per domain, ownership guards
└── .env.example
```

## Security notes

- bcrypt (cost 10) password hashing; JWT HS256 in an httpOnly, SameSite=Lax
  cookie (7-day expiry; `secure` in production).
- Middleware guards pages before render; every API handler re-verifies the
  session against the DB (picks up suspensions immediately).
- Ownership scoping everywhere: unknown **and** foreign devices/roles/memories
  all return 404 (no existence leaks). Admins bypass for device-plane workflows.
- MCP `auth_token` values never reach non-admin clients
  (`sanitizeFeature` in `src/server/queries/features.ts`).
- Change the seeded passwords and `JWT_SECRET` before any real deployment.

## Neobrutalism theme

Tokens live in `src/app/globals.css` (`@theme`): paper background with a dot
grid, `--color-brand-*` palette (yellow/lime/pink/cyan/orange/red/purple),
`--shadow-brutal-{sm,lg}` hard black offsets, Space Grotesk via `next/font`.
Components use `border-2 border-ink` + press-down hover interaction. No
component library needed.

## Device-plane & kids-ai-be alignment

This console owns its data today. Table/column names mirror the
[`kids-ai-be`](../kids-ai-be) Go backend plan (`users`, `devices`,
`roles`≈`personas`, `memories`), and the REST tree is shaped like its console
plane — so when the Go backend's device plane (WebSocket xiaozhi protocol,
pairing codes, OTA) matures, the Next.js app can be re-pointed at it by
swapping `src/server/queries/*` for HTTP calls. The xiaozhi-style pairing-code
flow is documented on the `devices` table in `sql/0001_schema.sql` and becomes
a `pairing_codes` table when the device plane lands.
