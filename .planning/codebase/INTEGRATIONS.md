# External Integrations

**Analysis Date:** 2026-04-24

## APIs & External Services

**Conversational AI:**
- ElevenLabs (via terenure-proyect) - Agent-based conversational AI for learner interactions
  - Integration: Remote demo app calls ElevenLabs API; cost tracking in `DEMO_DAILY_BUDGET_CENTS`
  - Reference: `/src/app/api/demos/spend/route.ts` reads per-call cost constants from terenure-proyect

**Bot Detection:**
- Cloudflare Turnstile - CAPTCHA/bot detection (optional)
  - Env var: `TURNSTILE_SECRET` (server-side verification)
  - Status: Referenced in env but no client-side implementation yet

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
  - Server secret: `SUPABASE_SERVICE_ROLE_KEY` (for RPC + privileged queries)
  - Client: `@supabase/supabase-js` (v2.101.1) and `@supabase/ssr` (v0.10.0)
  - Auth: Supabase Auth (email/password, JWT tokens)
  - Database location: `supabase/migrations/` — 9 migration files from Phase 1-3

**Tables:**
- `learners` - Student records (id, name, cohort, external_id, created_at)
- `submissions` - Attempt records (id, learner_id, module_id, type, attempt_num, payload, created_at)
- `profiles` - User profile extending auth (id, role, full_name, avatar_url)
- `demo_tokens` (via RPC) - Demo isolation schema for sandbox learners

**File Storage:**
- Supabase Storage - Recording bucket for submission artifacts
  - Bucket: `recordings` (via migration `00002_create_recordings_bucket.sql`)
  - URL patterns: `https://*.supabase.co/storage/v1/object/public/...`

**Caching & Session State:**
- Upstash Redis (REST API)
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: Fetch-based REST client in `src/lib/redis.ts`
  - Shared with terenure-proyect for cross-app token state
  - Keys:
    - `demo:token:{jti}` - Stored token metadata (JSON)
    - `demo:tokens:active` - Set of active token IDs (for list operations)
    - `demo:revoked` - Set of revoked token IDs (checked by terenure-proyect middleware)
    - `demo:spend:{date}` - Daily spend tracker (cents, checked against `DEMO_DAILY_BUDGET_CENTS`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (custom, not Clerk or Auth0)
  - Auth method: Email/password primary; OAuth placeholder (GitHub button present but not integrated)
  - JWT tokens: Signed by Supabase, managed via @supabase/supabase-js
  - Session: HTTP-only cookies (via @supabase/ssr)
  - Implementation: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`

**Role-Based Access Control:**
- Profiles table (role field: `admin`, `educator`, or other roles defined in `UserRole` type)
- Navigation RBAC: Implemented via `src/features/nav/` (see `docs/nav-rbac.md`)
- Middleware guard: Auth middleware in `src/lib/supabase/middleware.ts` redirects to `/auth/sign-in` for protected `/dashboard` routes

**JWT Token Signing (Demo):**
- Demo tokens signed by this app using `jose` library (v6.2.2)
- Secret: `DEMO_JWT_SECRET` (HS256 algorithm)
- Claims: jti, source, generatedBy, maxSubmissions, maxConversationSec, label
- Verified by terenure-proyect middleware; see `src/lib/demo-jwt.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry 10.45.0 (optional, disableable)
  - Setup: `src/instrumentation.ts` (server), `src/instrumentation-client.ts` (browser)
  - Config: `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ORG`, `NEXT_PUBLIC_SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
  - Disable: Set `NEXT_PUBLIC_SENTRY_DISABLED=true`
  - Features: Error capture, request context, source maps (tunneled via `/monitoring` route), Spotlight in dev

**Logs:**
- Server: Console logs (Sentry captures via instrumentation), `console.error()` in API handlers
- Browser: Sentry captures runtime errors and unhandled rejections
- Production: Removed via webpack (see `next.config.ts`: `removeConsole`)

## CI/CD & Deployment

**Hosting:**
- Vercel (primary platform)
  - Deployment: Next.js deployments from main branch (via GitHub integration assumed)
  - Edge functions: Sentry tunneling at `/monitoring`
  - Environment: Node.js 22 runtime

**CI Pipeline:**
- GitHub Actions (assumed, `.github/` directory present)
- Husky + lint-staged: Pre-commit linting with oxlint/oxfmt
- Build: `npm run build` → Next.js standalone build (enabled via `BUILD_STANDALONE=true`)

**Docker:**
- Multi-stage build (`Dockerfile`) for production deployment
- Base: Node.js 22-slim
- Stages: dependencies → builder → runner (non-root user)
- Output: Standalone Next.js app (`server.js`)

## Environment Configuration

**Required env vars (client-visible):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key for client-side auth
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN
- `NEXT_PUBLIC_SENTRY_ORG` - Sentry org for source maps
- `NEXT_PUBLIC_SENTRY_PROJECT` - Sentry project for source maps
- `NEXT_PUBLIC_SENTRY_DISABLED` - Set `true` to disable Sentry entirely

**Required env vars (server-only):**
- `SUPABASE_SERVICE_ROLE_KEY` - Privileged admin key for RPC + migrations
- `DEMO_JWT_SECRET` - Secret for signing demo JWT tokens (min 32 chars)
- `DEMO_BASE_URL` - Base URL for demo app (e.g., `https://demo.emerflows.com`)
- `DEMO_DAILY_BUDGET_CENTS` - Daily spend limit for demo (cents)
- `UPSTASH_REDIS_REST_URL` - Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token
- `SENTRY_AUTH_TOKEN` - Sentry API token for source map uploads
- `TURNSTILE_SECRET` - Cloudflare Turnstile secret (optional)

**Optional:**
- `BUILD_STANDALONE=true` - Build Next.js in standalone mode (Docker only)
- `NEXT_TELEMETRY_DISABLED=1` - Disable Next.js telemetry

**Secrets location:**
- Development: `.env` file (git-ignored)
- Staging/Production: Vercel environment variables dashboard

## Webhooks & Callbacks

**Incoming:**
- `/api/demos` (GET, POST) - List and mint demo tokens
- `/api/demos/[jti]` (DELETE) - Revoke demo token
- `/api/demos/spend` (GET) - Get today's spend estimate
- `/api/products`, `/api/users` - Placeholder CRUD endpoints

**Outgoing:**
- terenure-proyect - Admin mints JWT tokens; remote app uses them
  - Token stored in Upstash Redis (shared instance)
  - terenure-proyect middleware checks `demo:revoked` set on every request
  - Spend tracking: terenure-proyect increments `demo:spend:{date}` per call

## Cross-Repo Integration (terenure-proyect)

**Location:** External repository (not in this codebase)

**Shared State:**
- Upstash Redis instance — token revocation and spend tracking
- JWT signing secret — admin signs claims, remote app verifies signature

**Data Flow:**
1. Admin mints token via `/api/demos` POST
2. Token (JWT) + metadata stored in `demo:token:{jti}` + added to `demo:tokens:active`
3. Shared JWT secret in env: `DEMO_JWT_SECRET`
4. terenure-proyect receives `?t={jwt}` URL param
5. Middleware verifies JWT signature and checks `demo:revoked` set
6. Learner interactions → cost increments `demo:spend:{date}`
7. Admin views spend via `/api/demos/spend` GET

---

*Integration audit: 2026-04-24*
