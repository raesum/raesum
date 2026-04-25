# Raesum — Project Overview

## What Is This?

Raesum is a production-ready REST API server starter kit built on Node.js and Express. It provides a complete foundation for multi-tenant applications: authentication via AWS Cognito, role-based access control (RBAC), audit logging, PostgreSQL data access, structured logging, and caching. There is no frontend — this is a pure API backend.

The design philosophy (from the README) favors readability over cleverness, direct contact with SQL and HTTP internals, and minimal external dependencies. It targets mid-level developers who want a solid, opinionated starting point without magic.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ (ES Modules) |
| Framework | Express 4.22 |
| Database | PostgreSQL via pg-pool |
| Auth | AWS Cognito + JWT (jwks-rsa, cognito-express) |
| Caching | NodeCache (memory) or Redis (ioredis) |
| Sessions | express-session with memory or Redis store |
| Secrets | AWS Secrets Manager (falls back to config files) |
| Logging | Winston (console + file, custom log levels) |
| Config | node-config (default/local/test JSON files) |
| Validation | Joi |
| Testing | Jest + Faker.js |
| Dev tooling | Nodemon, Babel, ESLint, Prettier |

---

## Directory Structure

```
raesum/
├── config/                        # Environment config files
│   ├── default.json               # Base config (all environments)
│   ├── local.json                 # Local overrides (gitignored)
│   └── test.json                  # Test environment config
│
├── controlledData/                # Static reference data tracked in git
│   ├── authorization/
│   │   ├── action.json            # All permission action types
│   │   ├── object.json            # All resource object types
│   │   ├── scope.json             # Permission scope definitions (self/org/cross-org)
│   │   └── globalRoles.json       # Built-in system roles and their permissions
│   ├── seeds/                     # Seed data for dev/staging environments
│   └── responses.json             # Standardized API response message templates
│
├── documentation/
│   └── Bruno/                     # API documentation in Bruno format
│       ├── Auth/                  # Auth endpoint docs
│       └── Health/                # Health endpoint docs
│
├── logs/                          # Runtime log output directory
│
├── schema/
│   └── 1.sql                      # Versioned database migration (all DDL)
│
├── src/
│   ├── server.js                  # App entry point — wires everything together
│   ├── migrate.js                 # CLI entry: runs DB migrations
│   ├── seed.js                    # CLI entry: seeds DB with dev data
│   │
│   ├── modules/                   # Core infrastructure modules
│   │   ├── raesumServer.js        # Express app factory, safety checks
│   │   ├── raesumDB.js            # PostgreSQL pool wrapper + query runner
│   │   ├── raesumConfig.js        # Config loader with Secrets Manager support
│   │   ├── raesumLogger.js        # Winston logger setup
│   │   ├── raesumCache.js         # Memory/Redis cache abstraction
│   │   ├── raesumCognito.js       # Cognito OAuth2 flow + JWT validation
│   │   ├── raesumSession.js       # Session store builder (memory or Redis)
│   │   ├── raesumMigrate.js       # Migration orchestration logic
│   │   ├── raesumSeed.js          # Seeding logic (orgs, users, roles)
│   │   ├── raesumStartup.js       # First-run init (DB tagging, metadata sync)
│   │   └── raesumResponses.js     # Response template manager
│   │
│   ├── models/                    # Data access layer (SQL queries)
│   │   ├── raesumUser.js          # User CRUD + metadata key management
│   │   ├── raesumOrganization.js  # Org CRUD + user-org membership
│   │   ├── raesumAuthorization.js # Role/permission loading and lookup
│   │   ├── raesumAudit.js         # Audit log writes
│   │   └── raesumMetadata.js      # System metadata key-value store
│   │
│   ├── controllers/               # Route handler functions
│   │   ├── raesumUser.js          # login, loggedIn (OAuth callback), logout, getJWT
│   │   └── raesumHealth.js        # Health check handler
│   │
│   ├── routes/                    # Express router definitions
│   │   ├── raesumUser.js          # /api/v1/auth/* routes
│   │   └── raesumHealth.js        # /api/v1/health route
│   │
│   ├── middleware/
│   │   ├── cognitoAuthentication.js   # JWT + session cookie validation middleware
│   │   └── raesumRequestLogger.js     # Per-request logging (timing, user, path)
│   │
│   └── utils/                     # Shared helpers (validation, formatting, etc.)
│
└── test/
    ├── modules/                   # Unit tests for core modules
    └── routes/                    # Integration tests for API routes
```

---

## API Endpoints

All routes are prefixed with `/api/v1/`.

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| GET | `/health` | No | Database connectivity check |
| GET | `/auth/login` | No | Redirect to Cognito hosted login UI |
| GET | `/auth/loggedIn` | No | OAuth2 callback — exchanges code for session |
| POST | `/auth/getJWT` | No | Exchange authorization code for JWT tokens |
| GET | `/auth/logout` | Yes | Invalidate JWT + destroy session |

All other routes (to be added) are protected by the `cognitoAuthentication` middleware, which validates either a `Bearer` JWT token or a session cookie.

---

## Database Schema

Migrations live in [schema/1.sql](schema/1.sql). All tables are prefixed with `raesum_`.

### Core Tables

**`raesum_metadata`** — System configuration key-value pairs (tracks migration state, initialization flags, Cognito attribute names).

**`raesum_organization`** — Top-level tenant unit. Every user belongs to one or more organizations.

**`raesum_user`** — Application users. The `external_id` field links to the Cognito user pool. `current_organization_id` tracks which org is active for the session.

**`raesum_organization_x_user`** — Junction table: which users belong to which organizations.

### Authorization Tables

**`raesum_auth_action_type`** — Actions like `create`, `read`, `update`, `delete`, `set_status`.

**`raesum_auth_object_type`** — Resource types like `raesum_user`, `raesum_organization`, `raesum_role`.

**`raesum_auth_scope_type`** — Permission scopes: `self`, `organization`, `crossorganization`.

**`raesum_auth_role`** — Named roles (e.g., `raesumAdmin`, `raesumOrgAdmin`, `raesumMinimalUser`).

**`raesum_auth_role_x_permission`** — Maps roles to (action, object, scope) triples.

**`raesum_auth_user_x_organization_x_role`** — Assigns a user a role within a specific organization.

### Audit Table

**`raesum_audit_log`** — Immutable event log. Every data mutation should write a row here with `user_id`, `action_id`, `object_type_id`, `object_id`, and optional `metadata` JSON. Indexed for fast user- and object-level lookups.

---

## Authentication & Authorization Flow

### Authentication

1. Client calls `/auth/login` → redirected to Cognito hosted UI.
2. After login, Cognito calls back to `/auth/loggedIn` with an authorization code.
3. Server exchanges code for tokens (access, ID, refresh) via `/auth/getJWT` or the callback handler.
4. Token is returned to client as a JWT and/or set as a session cookie.
5. On subsequent requests, `cognitoAuthentication` middleware validates the JWT using JWKS from Cognito and retrieves the user profile from the database.

### Authorization (RBAC)

- Users are assigned **roles** per organization (stored in `raesum_auth_user_x_organization_x_role`).
- Each role has a set of **permissions** defined as (action, object, scope) triples.
- Scopes control reach: `self` = own records only, `organization` = all records in org, `crossorganization` = all records system-wide.
- Global roles (`raesumAdmin`, `raesumOrgAdmin`, `raesumMinimalUser`) are defined in [controlledData/authorization/globalRoles.json](controlledData/authorization/globalRoles.json) and loaded into the database at migration time.

---

## Configuration

Configuration uses the `node-config` library layered as:

1. `config/default.json` — base values for all environments
2. `config/local.json` — local developer overrides (not committed)
3. `config/test.json` — test-specific overrides
4. AWS Secrets Manager — production secrets fetched at runtime (12-hour TTL cache)

Key config areas:

```
server.port          — HTTP port (default 3000)
login.jwt            — Enable JWT auth (default true)
login.useSessionCookie — Enable session cookie auth (default true)
session.type         — "memory" or "redis"
session.secret       — Must be changed from default in production
cache.type           — "memory" or "redis"
connections.primaryDatabase — PostgreSQL host/port/database/user
connections.session.redis   — Redis for session store
connections.cache.redis     — Redis for cache store
aws.region           — AWS region
aws.cognito.*        — User pool ID, client ID/secret, callback URL
```

Safety checks at startup warn (or block) if production-unsafe config is detected (default session secret, missing HTTPS, JWT disabled, etc.).

---

## Startup Sequence

```
npm start
  └─ src/server.js
       ├─ Load config (config files + AWS Secrets Manager)
       ├─ Initialize logger
       ├─ Connect to PostgreSQL (fail fast if unreachable)
       ├─ Run raesumStartup: sync Cognito metadata keys, tag DB on first run
       ├─ Clear in-flight caches
       ├─ Build session store (memory or Redis)
       ├─ Mount middleware: Helmet, CORS, session, body-parser, request logger
       ├─ Mount auth middleware (JWT/cookie validation) on protected routes
       ├─ Mount routers: /api/v1/health, /api/v1/auth
       └─ Listen on configured port
```

### Database Setup Commands

```bash
npm run migrate   # Apply schema/1.sql + load controlledData into DB
npm run seed      # Seed dev data (prompts for confirmation, blocked on prod)
npm run dev       # Start with Nodemon + Babel (auto-reload)
```

---

## Built-in Roles

| Role Key | Description |
|----------|-------------|
| `raesumAdmin` | Super admin — full access across all organizations |
| `raesumOrgAdmin` | Organization admin — full access within one org |
| `raesumMinimalUser` | Basic user — read access to own records only |

---

## Logging

Winston is configured with custom log levels in priority order:

```
critical > error > warning > route > info > verbose > debug
```

Logs write to console and to files in `logs/`. The request logger middleware records method, path, response status, latency, and authenticated user for every request.

---

## Security Features

- **Helmet** — sets standard HTTP security headers
- **CORS** — configurable cross-origin policy
- **Parameterized SQL** — no string interpolation in queries
- **JWT validation** — signature verified against Cognito JWKS endpoint
- **Session security** — httpOnly + secure cookie flags in production
- **Token revocation** — revoked JWTs cached to prevent reuse
- **Secrets rotation** — credentials fetched from AWS Secrets Manager, not hardcoded
- **Audit log** — immutable record of all data mutations
- **Seeding guard** — seed script refuses to run if NODE_ENV is production

---

## Testing

Tests live in `test/` and use Jest with Faker.js for test data generation.

```bash
npm test          # Run all tests
npm run test:unit # Unit tests (modules)
npm run test:int  # Integration tests (routes)
```

---

## Key Design Decisions

- **No ORM** — raw SQL via pg-pool gives developers direct visibility into queries.
- **No frontend** — API only; clients can be SPAs, mobile apps, or other services.
- **Controlled data in git** — roles, permissions, and response templates are version-controlled static files, not database-only config.
- **AWS-optional** — Secrets Manager and Cognito integrate when configured but the server starts without them (using local config).
- **Singleton modules** — DB pool, cache, logger, and config are instantiated once and imported as singletons.
