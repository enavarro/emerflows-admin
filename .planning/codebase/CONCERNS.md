# Codebase Concerns

**Analysis Date:** 2026-04-24

## Tech Debt

**RPC drift between repos:**
- Issue: `save_conversation_draft` and `get_latest_submission` exist in production Supabase but are not present in any migration file in this repo
- Files: `supabase/migrations/` (missing) — referenced in `DEPLOYMENT_PLAN.md` "Deferred (tech debt, non-blocking)"
- Impact: Fresh Supabase rebuild from this repo will not produce the same schema as prod
- Fix approach: Add `supabase/migrations/00005b_retroactive_rpcs.sql` capturing both function definitions

**Dual-repo migration ownership:**
- Issue: Migrations 00001–00005 were copied from `terenure-proyect/frontend` as a baseline; both repos still hold copies until full cutover
- Files: `supabase/migrations/00001*.sql` through `00005*.sql`
- Impact: Schema drift risk if either side edits independently; type-generation cannot be centralized
- Fix approach: Per `DEPLOYMENT_PLAN.md`: delete `terenure-proyect/supabase/migrations/`, set up shared `@emerflows/db-types` package after first end-to-end migration runs cleanly from admin repo

**Scheduled demo data purge not wired:**
- Issue: `purge_old_demo_data()` SQL function defined in `00006_add_demo_isolation.sql` but never scheduled
- Files: `supabase/migrations/00006_add_demo_isolation.sql`
- Impact: Demo `learners` / `submissions` rows accumulate indefinitely; storage growth unmonitored
- Fix approach: `00010_schedule_demo_purge.sql` using `pg_cron` (deferred until post-launch + volume monitor in place per DEPLOYMENT_PLAN)

**Hardcoded demo limits:**
- Issue: `HARDCODED_MAX_SUBMISSIONS = 2` and `HARDCODED_MAX_CONVERSATION_SEC = 210` baked into route
- Files: `src/app/api/demos/route.ts:17-18`
- Impact: Cannot tune per-token; admin UI cannot expose limits as form fields
- Fix approach: Move to env vars or per-token form input; surface in `mintInputSchema`

**Mock API leftover from starter:**
- Issue: `src/constants/mock-api.ts` (246 lines) is template scaffolding that no production feature uses
- Files: `src/constants/mock-api.ts`
- Impact: Dead code; risk of accidentally being imported into a real feature
- Fix approach: Delete and remove any remaining imports (verify with grep first)

## Known Bugs

**No active reported bugs.** Phase 3 demo (demo.emerflows.com) was smoke-tested 2026-04-14 and is live.

## Security Considerations

**RPC EXECUTE permissions on anon key (CRITICAL):**
- Risk: `*_demo` wrappers and `get_upload_path*` functions are SECURITY DEFINER but callable directly with the public Supabase anon key, bypassing the Next.js route's rate-limit + input validation
- Files: `supabase/migrations/00007_demo_rpc_wrappers.sql`, `supabase/migrations/00008_upload_path_rpcs.sql`, `supabase/migrations/00009_harden_upload_path_rpcs.sql` (defense-in-depth regex was added but `REVOKE EXECUTE` is parked)
- Current mitigation: Regex validation + `FOR UPDATE` locking + `search_path` pinning landed in `00009_harden_upload_path_rpcs.sql`; demo middleware in `terenure-proyect` is the primary gate
- Recommendations: Per `DEPLOYMENT_PLAN.md` TODO — switch student-app route from anon to `service_role` first (currently `lib/supabase/server.ts` uses anon), THEN `REVOKE EXECUTE ... FROM anon` on all `*_demo` and `get_upload_path*` functions. Do BEFORE Phase 6 LinkedIn launch.

**GCP billing kill-switch untested (CRITICAL pre-launch):**
- Risk: Budget + Pub/Sub `billing-kill-switch` topic + `stop_billing` Cloud Function deployed on Gemini project `gen-lang-client-0750871492` but never end-to-end tested. Unknown if it actually disables billing on runaway costs.
- Files: External — GCP project (not in this repo); tracking in `DEPLOYMENT_PLAN.md` "TODO (parked)"
- Current mitigation: Deployed; IAM granted (compute SA = Billing Account Admin)
- Recommendations: Test plan in DEPLOYMENT_PLAN — publish `{"budgetAmount":10,"costAmount":15}` (base64) to topic, verify "DISABLING BILLING" in function logs, confirm unlinks, manually re-link. Must complete before Phase 6.

**Demo JWT secret cross-repo sync drift:**
- Risk: `DEMO_JWT_SECRET` env var must be identical in `emerflows-admin` (signs) and `terenure-proyect/frontend` (verifies). No CI / secret-manager coupling.
- Files: `src/lib/demo-jwt.ts` (this repo) + `terenure-proyect/middleware.ts` (other repo)
- Current mitigation: Both reference Vercel env vars; manual rotation required in two places
- Recommendations: Document rotation runbook; consider migrating to a managed secret (Doppler / Vercel team-level env)

**Cross-repo demo middleware drift:**
- Risk: Demo middleware lives in `terenure-proyect` (commit 124df16). Any change to JWT claims (e.g., adding cohort scope) requires synchronized PRs in both repos.
- Files: External — `terenure-proyect/middleware.ts` (other repo); claim shape defined here in `src/lib/demo-jwt.ts`
- Current mitigation: Layer architecture documented; tracked in memory
- Recommendations: Extract JWT claim type + sign/verify utility into `@emerflows/demo-jwt` shared package

**Admin-only gating relies on layout, not middleware:**
- Risk: `/api/demos/*` route handlers call `requireUser()` which only checks an authenticated session — does NOT check admin role. Any signed-in Supabase user could call mint/list/revoke.
- Files: `src/app/api/demos/route.ts:35-41`, `src/app/api/demos/[jti]/route.ts`
- Current mitigation: Sign-up is restricted at the Supabase project level; dashboard route is RBAC-gated by `useNav` filtering (UI only)
- Recommendations: Add admin-role check inside `requireUser()` (or a wrapper) — query Supabase user metadata or a roles table. Defense-in-depth against a regression in Supabase signup config.

**No CSRF protection on mutating endpoints:**
- Risk: POST/DELETE on `/api/demos*` rely on cookie auth; no CSRF token check
- Files: `src/app/api/demos/route.ts:76`, `src/app/api/demos/[jti]/route.ts`
- Current mitigation: Same-site cookies (Supabase default), CORS not opened
- Recommendations: Verify Supabase cookies are `SameSite=Lax` or stricter; add CSRF token if cross-origin admin embedding ever planned

**`console.error` of internal failure messages:**
- Risk: Stack traces / Redis errors logged to server output (Vercel function logs) — could leak internal infrastructure details if log shipping is misconfigured
- Files: `src/app/api/demos/route.ts:71`, `:129`
- Current mitigation: Sentry wired (`@sentry/nextjs ^10.45.0`); logs scoped to admin-only environment
- Recommendations: Replace `console.error` with structured logger (`pino` / Sentry breadcrumbs); strip error.message from response bodies (already done — only generic strings returned)

## Performance Bottlenecks

**`/api/demos` GET is N+1 against Redis:**
- Problem: Lists all active tokens by reading `ACTIVE_INDEX` set, then issuing a separate `GET` + `SISMEMBER` per JTI
- Files: `src/app/api/demos/route.ts:43-74` (loop at line 54)
- Cause: Per-token round trip to Upstash REST endpoint — adds latency proportional to token count
- Improvement path: Use Redis pipelining (batch `MGET` + `SMISMEMBER`) or store tokens in a single hash; add a `<= 100` cap on active demos

**No bundle-size monitoring:**
- Problem: No `@next/bundle-analyzer` script; no per-page bundle budget enforced
- Files: `package.json` (no analyze script), `next.config.ts`
- Cause: Not configured
- Improvement path: Add `npm run analyze` script and budget check; especially relevant given large Radix + Tabler icon surface

**React Query stale times default:**
- Problem: `src/lib/query-client.ts` likely uses defaults (0 stale time, 5min cache); demo list refetches on every focus
- Files: `src/lib/query-client.ts`
- Cause: Defaults
- Improvement path: Set sane per-feature stale times in queries (e.g., `demosKeys.list` → 30s); document the policy

## Fragile Areas

**`src/components/forms/demo-form.tsx` exceeds 800-line guideline:**
- Files: `src/components/forms/demo-form.tsx` (828 lines)
- Why fragile: Single component handles many fields + state; `useStore` subscriptions scattered; hard to test in isolation
- Safe modification: Split by section (general / dimensions / pricing / variants) into composable subforms; use `useFormFields<T>()` factories per section
- Test coverage: None (no component tests at all)

**`src/components/ui/infobar.tsx` (766 lines) and `sidebar.tsx` (693 lines):**
- Files: `src/components/ui/infobar.tsx`, `src/components/ui/sidebar.tsx`
- Why fragile: Large UI primitives copied from shadcn registry — local edits mean diverging from upstream
- Safe modification: Treat as vendored; track upstream changes in shadcn registry; extract project-specific behavior to wrapper components rather than editing in place
- Test coverage: None

**Cookie format coupling to `@supabase/ssr` version:**
- Files: `tests/e2e/demos-api-check.mjs:79-81`, `src/lib/supabase/server.ts`
- Why fragile: Smoke script hard-codes `"base64-" + base64url(JSON)` cookie format. A `@supabase/ssr` major-version bump could change this and silently break the smoke test.
- Safe modification: Pin `@supabase/ssr` minor version (currently `^0.10.0`); add unit test that round-trips cookie encode/decode against the live SDK
- Test coverage: Indirect only (the smoke test itself depends on this format)

**Dashboard-only gating for demo APIs (see Security):**
- Files: `src/app/api/demos/route.ts`
- Why fragile: A future regression that allows non-admin signups (or removes nav-config RBAC) would silently expose mint/revoke
- Safe modification: Add server-side admin-role assertion in `requireUser()` and assert in tests
- Test coverage: None — no role-based negative test

## Scaling Limits

**Active demos enumerated linearly per request:**
- Current capacity: Unbounded — set `ACTIVE_INDEX` grows with mints
- Limit: Practical cap unclear; latency degrades > ~50 active tokens given per-token Redis roundtrip
- Scaling path: Pipelining (above) + paginated index + soft cap per admin

**Single-region Vercel deployment:**
- Current capacity: One region (likely cdg1/iad1 — verify in Vercel project)
- Limit: Latency from non-EU recruiters during demo
- Scaling path: Edge runtime for read endpoints (`/api/demos`, `/api/demos/spend`); keep mint/revoke node-runtime due to JWT signing cost

**Daily spend counter is a single Redis key:**
- Current capacity: Single Upstash Redis instance, single counter `demo:spend:YYYY-MM-DD`
- Limit: Hot key under burst; clock skew between Vercel regions could double-count
- Scaling path: Sharded counters by hour + nightly reduce; or migrate to Postgres `demo_usage_log` (already exists per migration `00006`) as source of truth

## Dependencies at Risk

**`oxlint` / `oxfmt` (^1.57 / ^0.42):**
- Risk: Pre-1.0-style versioning for `oxfmt`; both are newer Rust-based replacements for ESLint/Prettier
- Impact: API instability; breaking changes between minor versions
- Migration plan: Pin exact versions; have ESLint/Prettier fallback path documented if needed

**`zod ^4.3.6`:**
- Risk: Zod v4 is recent; ecosystem (TanStack Form adapter, etc.) may still target v3 in places
- Impact: Subtle API mismatches
- Migration plan: Audit all Zod usages; pin to a working minor version pre-launch

**`next 16.2.1` + `react 19.2.4`:**
- Risk: Next 16 is current major; React 19 RSC behavior still evolving
- Impact: Hydration / streaming regressions in minor bumps
- Migration plan: Pin major; track `next` release notes; smoke-test before any `next` bump

**`@sentry/nextjs ^10.45.0`:**
- Risk: Sentry 10 instrumentation API differs from 9; misconfiguration silently disables capture
- Impact: Errors in prod not visible
- Migration plan: Verify Sentry receives a test event per environment (`/sentry-test` route or one-shot script)

## Missing Critical Features

**Audit log for admin demo actions:**
- Problem: Mint / revoke actions are not recorded anywhere persistent (Redis stores tokens, but no append-only log of who minted what when)
- Blocks: Forensics if a demo link is abused; cannot answer "who minted this token?" beyond the value of `createdBy` on the live token (lost when token expires)

**Budget enforcement visibility for non-engineers:**
- Problem: Spend gauge exists in admin UI but no alert / Slack notification when daily budget hits 80% / 100%
- Blocks: Hands-off operation; requires admin to actively check the gauge

**Operations runbook:**
- Problem: No `RUNBOOK.md` for: demo abuse incident, Redis outage, GCP billing tripped, Supabase RLS regression, JWT secret rotation
- Blocks: Single-person bus factor; recovery is recovered from memory

**Negative-path E2E coverage:**
- Problem: No tests for: revoked token rejection, expired token rejection, rate-limit response, budget-tripped response
- Blocks: Cannot ship Phase 6 with confidence in failure modes

## Test Coverage Gaps

**JWT sign/verify (`src/lib/demo-jwt.ts`):**
- What's not tested: Round-trip of valid token, rejection of tampered token, expiry enforcement, jti uniqueness
- Files: `src/lib/demo-jwt.ts`
- Risk: A signing-key change or claim-shape regression would break demo middleware silently
- Priority: HIGH

**Redis layer (`src/lib/redis.ts`):**
- What's not tested: Spend counter increment, daily key rotation, rate-limit window math, error fallthrough
- Files: `src/lib/redis.ts`
- Risk: Spend over-counting or under-counting; rate-limit too lax or too strict
- Priority: HIGH

**RBAC nav filter (`src/hooks/use-nav.ts`):**
- What's not tested: Role-to-item filtering, role transitions, default-role fallback
- Files: `src/hooks/use-nav.ts`, `src/config/nav-config.ts`
- Risk: Regression that exposes admin-only nav to non-admins
- Priority: HIGH

**Supabase server client (`src/lib/supabase/server.ts`):**
- What's not tested: Cookie read/write contract, auth error paths
- Files: `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Risk: SSR auth break across `@supabase/ssr` upgrades
- Priority: MEDIUM

**RLS policy regression:**
- What's not tested: Real user querying `learners` view sees only `is_demo=false` rows; demo session sees only its own rows
- Files: `supabase/migrations/00006_add_demo_isolation.sql` (RLS) — no test
- Risk: Cross-tenant data leak (demo recruiter sees real student data, or vice versa)
- Priority: HIGH

**Form validation (Zod schemas):**
- What's not tested: `mintInputSchema` boundary cases (empty label, oversized label, special chars)
- Files: `src/features/demos/schemas/mint-input.ts`
- Risk: Bypass of label sanity checks
- Priority: MEDIUM

---

*Concerns audit: 2026-04-24*
