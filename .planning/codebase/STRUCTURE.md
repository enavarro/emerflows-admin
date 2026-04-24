# Codebase Structure

**Analysis Date:** 2026-04-24

## Directory Layout

```
emerflows-admin/
├── src/
│   ├── app/                    # Next.js 16 App Router (routes + API)
│   │   ├── about/              # Static about page
│   │   ├── auth/               # Auth routes (sign-in, sign-up)
│   │   ├── dashboard/          # Authenticated admin dashboard
│   │   │   ├── demos/          # Demo token mint/list/revoke UI (Phase 4)
│   │   │   ├── overview/       # Cohort analytics (parallel routes)
│   │   │   ├── product/        # Product management pages
│   │   │   ├── users/          # User management
│   │   │   ├── forms/          # Form system examples
│   │   │   ├── elements/       # Element showcase
│   │   │   ├── react-query/    # React Query demo
│   │   │   ├── profile/        # User profile
│   │   │   ├── layout.tsx      # Dashboard shell (sidebar + header)
│   │   │   └── page.tsx        # Dashboard landing
│   │   ├── api/                # Route handlers (server-only work)
│   │   │   ├── demos/          # Demo token mint/list/revoke + spend gauge
│   │   │   │   ├── route.ts            # GET list, POST mint
│   │   │   │   ├── [jti]/route.ts      # DELETE revoke
│   │   │   │   └── spend/route.ts      # GET budget/spend snapshot
│   │   │   ├── products/       # Product CRUD route handlers
│   │   │   └── users/          # User CRUD route handlers
│   │   ├── privacy-policy/     # Static legal pages
│   │   ├── terms-of-service/
│   │   ├── layout.tsx          # Root layout + providers (theme, query, auth)
│   │   ├── page.tsx            # Landing page (redirects to dashboard if signed in)
│   │   ├── global-error.tsx    # Sentry-wired error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   └── favicon.ico
│   │
│   ├── features/               # Feature-based modules (DOMAIN LAYER)
│   │   ├── auth/               # Sign-in / sign-up UI + server actions
│   │   ├── demos/              # Demo-token feature (mint, list, revoke, spend)
│   │   │   ├── api/
│   │   │   │   ├── types.ts            # Request/response contracts
│   │   │   │   ├── service.ts          # Fetch wrappers calling /api/demos
│   │   │   │   ├── queries.ts          # React Query key factories + options
│   │   │   │   └── mutations.ts        # useMutation hooks
│   │   │   ├── components/
│   │   │   │   ├── demos-listing.tsx           # Page-level listing shell
│   │   │   │   ├── mint-token-form-sheet.tsx   # TanStack Form sheet for minting
│   │   │   │   ├── tokens-table.tsx            # Table with revoke action
│   │   │   │   └── spend-gauge.tsx             # Daily budget gauge
│   │   │   └── schemas/mint-input.ts           # Zod schema for mint form
│   │   ├── products/           # Product management (types → service → queries pattern)
│   │   ├── users/              # User management (same pattern)
│   │   ├── overview/           # Dashboard analytics widgets
│   │   ├── forms/              # Form system demos
│   │   ├── elements/           # shadcn-style element examples
│   │   ├── react-query-demo/   # React Query showcase
│   │   └── profile/            # Profile edit feature
│   │
│   ├── components/             # Cross-feature UI building blocks
│   │   ├── ui/                 # shadcn/ui primitives (button, table, sheet, etc.)
│   │   ├── layout/             # Sidebar, header, page container
│   │   ├── forms/              # Reusable form field wrappers
│   │   ├── themes/             # Theme selector + provider
│   │   ├── kbar/               # Cmd+K command palette
│   │   ├── modal/              # Modal primitives
│   │   └── icons.tsx           # Icon registry (SINGLE source of @tabler imports)
│   │
│   ├── lib/                    # Framework-agnostic utilities
│   │   ├── api-client.ts       # Fetch wrapper for /api routes
│   │   ├── compose-refs.ts
│   │   ├── data-table.ts       # Data table helpers
│   │   ├── demo-jwt.ts         # JWT sign/verify (jose) — demo tokens
│   │   ├── format.ts           # Formatters (currency, date, etc.)
│   │   ├── parsers.ts          # nuqs/zod parsers
│   │   ├── query-client.ts     # React Query client config
│   │   ├── redis.ts            # Upstash Redis client (rate limit + spend)
│   │   ├── searchparams.ts     # nuqs searchParamsCache
│   │   ├── utils.ts            # cn() and small helpers
│   │   └── supabase/           # Supabase SSR helpers (server, client, middleware)
│   │
│   ├── config/                 # Configuration modules
│   │   └── nav-config.ts       # Navigation entries + RBAC metadata
│   │
│   ├── constants/              # Static constants and mock data
│   │   └── mock-api.ts         # Template mock API (not used in prod)
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-data-table.ts   # Data table state + nuqs wiring
│   │   └── use-nav.ts          # RBAC-filtered nav items
│   │
│   ├── styles/                 # Global + theme CSS
│   │   ├── globals.css         # Tailwind v4 imports + view transitions
│   │   ├── theme.css           # Theme root
│   │   └── themes/             # Per-theme OKLCH tokens
│   │
│   ├── types/                  # Shared TypeScript types
│   │   └── index.ts            # NavItem, Role, etc.
│   │
│   ├── instrumentation.ts          # Next.js server instrumentation (Sentry)
│   ├── instrumentation-client.ts   # Client instrumentation (Sentry)
│   └── proxy.ts                    # Proxy/middleware helper
│
├── supabase/
│   └── migrations/             # Ordered SQL migrations (owned by admin repo)
│       ├── 00001_create_foundation_schema.sql
│       ├── 00002_create_recordings_bucket.sql
│       ├── 00003_add_draft_submit_flow.sql
│       ├── 00004_add_get_submitted_attempts_rpc.sql
│       ├── 00005_add_source_submission_id.sql
│       ├── 00006_add_demo_isolation.sql           # demo flag + views + purge
│       ├── 00007_demo_rpc_wrappers.sql            # *_demo SECURITY DEFINER RPCs
│       ├── 00008_upload_path_rpcs.sql             # get_upload_path + _demo variant
│       └── 00009_harden_upload_path_rpcs.sql      # regex validation + race fix
│
├── tests/
│   └── e2e/                    # Playwright end-to-end tests
│       ├── demos.spec.ts               # Browser flow: mint token via UI
│       └── demos-api-check.mjs         # Direct API smoke test (node)
│
├── scripts/
│   ├── cleanup.js              # Feature removal helper (from starter)
│   └── postinstall.js          # Dev-server setup message
│
├── docs/                       # Project documentation
│   ├── forms.md                # TanStack Form + Zod patterns
│   ├── themes.md               # OKLCH theme system
│   ├── nav-rbac.md             # Nav + role-based access control
│   └── demo-budget-formula.md  # Demo budget math
│
├── public/                     # Static assets
│   └── assets/
│
├── .agents/                    # Per-project agent skills (shared with .claude/)
├── .claude/                    # Claude Code skills + config
├── .husky/                     # Git hooks (lint-staged)
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # This directory
│
├── AGENTS.md                   # Full project overview (authoritative)
├── CLAUDE.md                   # Critical conventions + color scheme
├── DEPLOYMENT_PLAN.md          # Phased deploy tracker (Phases 0–6)
├── README.md
├── package.json                # scripts: dev, build, lint (oxlint), format (oxfmt)
├── tsconfig.json
├── next.config.ts
├── components.json             # shadcn/ui config
├── .oxlintrc.json              # Linter config
├── .oxfmtrc.json               # Formatter config
├── .gitignore
└── Dockerfile
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router — route segments, layouts, API route handlers
- Contains: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, parallel/intercepting routes
- Key files: `src/app/layout.tsx`, `src/app/dashboard/layout.tsx`, `src/app/api/demos/route.ts`

**`src/features/`:**
- Purpose: Domain modules grouping API access + UI + schemas per feature
- Contains: `api/` (types, service, queries, mutations), `components/`, `schemas/`, sometimes `constants/`
- Key files: `src/features/demos/api/service.ts`, `src/features/products/api/queries.ts`

**`src/components/`:**
- Purpose: Cross-feature reusable UI (never feature-specific)
- Contains: shadcn/ui primitives, layout, form wrappers, theme controls, icons registry
- Key files: `src/components/icons.tsx` (icon registry — MUST be single import source), `src/components/layout/page-container.tsx`, `src/components/ui/tanstack-form.tsx`

**`src/lib/`:**
- Purpose: Framework-agnostic utilities and clients
- Contains: Supabase helpers, API client, JWT utils, Redis client, query-client config, nuqs parsers
- Key files: `src/lib/api-client.ts`, `src/lib/demo-jwt.ts`, `src/lib/redis.ts`, `src/lib/supabase/`

**`src/config/`:**
- Purpose: Configuration — data, not code
- Contains: Navigation config with RBAC roles
- Key files: `src/config/nav-config.ts`

**`src/hooks/`:**
- Purpose: Custom React hooks shared across features
- Key files: `src/hooks/use-data-table.ts`, `src/hooks/use-nav.ts`

**`src/styles/`:**
- Purpose: Global CSS and theme tokens (OKLCH)
- Key files: `src/styles/globals.css`, `src/styles/themes/*.css`

**`supabase/migrations/`:**
- Purpose: Ordered, numbered SQL migrations — source of truth for DB schema
- Contains: `00NNN_description.sql` files applied in filename order
- Key files: `00006_add_demo_isolation.sql`, `00009_harden_upload_path_rpcs.sql`

**`tests/e2e/`:**
- Purpose: End-to-end tests (Playwright) and API smoke tests (node)
- Key files: `tests/e2e/demos.spec.ts`, `tests/e2e/demos-api-check.mjs`

**`docs/`:**
- Purpose: Markdown reference docs supplementing `CLAUDE.md` / `AGENTS.md`
- Key files: `docs/forms.md`, `docs/themes.md`, `docs/nav-rbac.md`

**`.planning/`:**
- Purpose: GSD planning artifacts (this directory + siblings)
- Generated: Partially (by GSD commands)
- Committed: Yes (via `commit_docs: true` config)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout — providers (theme, React Query, Supabase auth), fonts, Sentry
- `src/app/dashboard/layout.tsx`: Dashboard shell (sidebar, header, breadcrumbs)
- `src/app/page.tsx`: Marketing landing page
- `src/app/auth/sign-in/page.tsx`: Authentication entry
- `src/proxy.ts`: Middleware-like proxy helper (paired with Next middleware)

**Configuration:**
- `next.config.ts`: Next.js build + Sentry config
- `tsconfig.json`: TS strict mode, path alias `@/*` → `src/*`
- `components.json`: shadcn/ui generator config
- `.oxlintrc.json`: Linter rules (no-console, exhaustive-deps, etc.)
- `.oxfmtrc.json`: Formatter settings (single quotes, 2-space, no trailing comma)
- `src/config/nav-config.ts`: Nav items + RBAC role metadata
- `package.json`: Scripts (dev, build, lint, lint:strict, format)

**Core Logic:**
- `src/lib/supabase/server.ts` / `client.ts` / `middleware.ts`: Supabase SSR clients
- `src/lib/demo-jwt.ts`: JWT sign/verify (jose) for demo tokens
- `src/lib/redis.ts`: Upstash Redis — rate limit + daily spend tracking
- `src/lib/api-client.ts`: Shared fetch wrapper for `/api` routes
- `src/app/api/demos/route.ts`: Token mint + list (admin-gated)
- `src/app/api/demos/[jti]/route.ts`: Token revoke
- `src/app/api/demos/spend/route.ts`: Current day spend + budget
- `src/hooks/use-nav.ts`: RBAC filter on nav items
- `src/hooks/use-data-table.ts`: nuqs-backed table state

**Testing:**
- `tests/e2e/demos.spec.ts`: Playwright browser flow
- `tests/e2e/demos-api-check.mjs`: Direct-fetch API smoke
- No unit test framework configured (no vitest/jest config present)

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g., `mint-token-form-sheet.tsx`, `tokens-table.tsx`)
- Route handlers: `route.ts` (Next.js convention)
- Page segments: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` (Next.js convention)
- API layer files: `types.ts`, `service.ts`, `queries.ts`, `mutations.ts` (one of each per feature)
- Migrations: `NNNNN_snake_case_description.sql` (5-digit zero-padded index)
- Schemas: `kebab-case.ts` under `schemas/` (e.g., `mint-input.ts`)

**Directories:**
- Feature modules: singular or plural noun, lowercase (`demos`, `users`, `products`, `auth`)
- App route segments: lowercase kebab-case (`privacy-policy`, `terms-of-service`)
- Dynamic segments: `[param]` (e.g., `[jti]`, `[id]`)

**Functions:**
- Camel case: `listTokens`, `mintToken`, `revokeToken`, `getSpend`
- React hooks: `useXxx` prefix (e.g., `useNav`, `useDataTable`)
- Zod schemas: `xxxSchema` suffix (e.g., `mintInputSchema`)

**Types:**
- PascalCase interfaces/types: `MintTokenInput`, `SpendResponse`, `ListTokensResponse`
- Suffix request/response types with `Input` / `Response` / `Payload`

**Query keys:**
- Feature-scoped factory object with `.all`, `.list`, `.detail` methods
  (e.g., `demosKeys.all`, `demosKeys.list(filters)`, `demosKeys.detail(jti)`)

## Where to Add New Code

**New feature (e.g., "cohorts"):**
- Primary code: `src/features/cohorts/`
  - `api/types.ts` → response shapes, filter types, payload types
  - `api/service.ts` → fetch wrappers calling `/api/cohorts`
  - `api/queries.ts` → `cohortsKeys` factory + `cohortsQueryOptions(...)`
  - `api/mutations.ts` → `useCreateCohort`, `useDeleteCohort`
  - `components/` → listing, table, form-sheet
  - `schemas/` → Zod input schemas
- API routes: `src/app/api/cohorts/route.ts` (+ `[id]/route.ts` for detail/delete)
- Page: `src/app/dashboard/cohorts/page.tsx` with server-side `void prefetchQuery(...)` + `HydrationBoundary`
- Nav entry: add to `src/config/nav-config.ts` with required role
- Tests: `tests/e2e/cohorts.spec.ts` + `tests/e2e/cohorts-api-check.mjs`

**New page:**
- Location: `src/app/dashboard/<segment>/page.tsx`
- Use `PageContainer` with `pageTitle` / `pageDescription` / `pageHeaderAction` props — never import `<Heading>` manually
- Server component: prefetch React Query, wrap children in `HydrationBoundary` + `<Suspense fallback>`

**New component (shared):**
- Implementation: `src/components/<category>/<name>.tsx` where `<category>` is `ui` | `layout` | `forms` | `themes` | etc.
- If feature-specific: put in `src/features/<feature>/components/` instead

**New icon:**
- Add to `src/components/icons.tsx` export map — import the tabler icon once here
- Consumers import from `@/components/icons`, NEVER from `@tabler/icons-react` directly

**New utility:**
- Shared helpers: `src/lib/<name>.ts`
- Hooks: `src/hooks/use-<name>.ts`
- Keep framework-agnostic utils in `src/lib/`; keep React-specific state in `src/hooks/`

**New migration / DB table:**
- File: `supabase/migrations/NNNNN_description.sql` (next index, zero-padded)
- SECURITY DEFINER functions: pin `SET search_path = public, pg_temp` (see `00009_harden_upload_path_rpcs.sql` for the pattern)
- After write, apply via Supabase CLI / SQL editor; verify with smoke test

**New form:**
- Use `useAppForm` + `useFormFields<T>()` from `src/components/ui/tanstack-form.tsx`
- Zod schema under `features/<feature>/schemas/<name>.ts`
- See `docs/forms.md` for composable field patterns

## Special Directories

**`src/constants/`:**
- Purpose: Mock data and static constants (e.g., `mock-api.ts` from starter template)
- Generated: No
- Committed: Yes
- Note: `mock-api.ts` is a starter template artifact — prefer real API layer (`features/*/api/service.ts`) for new work

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `next build` / `next dev`)
- Committed: No (gitignored)

**`test-results/`:**
- Purpose: Playwright test artifacts (screenshots, videos, traces)
- Generated: Yes (by Playwright runs)
- Committed: No (should be gitignored; verify)

**`.planning/codebase/`:**
- Purpose: GSD codebase map (these docs)
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes (when `commit_docs: true`)

**`.agents/skills/` and `.claude/skills/`:**
- Purpose: Per-project agent skills (shadcn, tanstack-form, tanstack-query, next-best-practices, etc.)
- Generated: No (curated)
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at site root (favicons, OG images, etc.)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-24*
