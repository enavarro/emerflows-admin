---
phase: 03
plan: 02
subsystem: teach-admin
tags: [api, mutation, security, supabase, route-handler, react-query]
requires:
  - "Phase 1 schema migration 00010 (submissions.reviewed_at + reviewed_by + admin column-level UPDATE GRANT + RLS USING(is_admin()))"
  - "src/features/teach/api/types.ts MarkReviewedInput + MarkReviewedResponse contracts (Phase 1)"
  - "src/features/teach/api/queries.ts teachKeys factory (Phase 1)"
  - "src/lib/supabase/server.ts createClient (user-session)"
  - "src/lib/auth/require-admin.ts requireAdmin gate"
  - "src/lib/api-client.ts apiClient<T> wrapper"
  - "src/lib/query-client.ts getQueryClient"
provides:
  - "POST /api/teach/submissions/[id]/review route handler"
  - "markReviewed() client-callable transport"
  - "markReviewedMutation typed mutationOptions"
affects:
  - "All cached queries under teachKeys.all (cohort matrix, learner page, viewer) on success"
tech-stack:
  added: []
  patterns:
    - "User-session Supabase client mutation (D-04a) with RLS + column-level GRANT enforcement"
    - "Defense-in-depth requireAdmin() at route handler entry"
    - "Zod safeParse body validation"
    - "mutationOptions + invalidateQueries({ queryKey: <feature>.all }) cascade pattern"
    - "Sibling service-client.ts to preserve service.ts 'server-only' purity"
key-files:
  created:
    - "src/app/api/teach/submissions/[id]/review/route.ts"
    - "src/features/teach/api/service-client.ts"
    - "src/features/teach/api/mutations.ts"
  modified: []
decisions:
  - "Used user-session Supabase client (createClient from @/lib/supabase/server), NOT createAdminClient — D-04a locked"
  - "Added defense-in-depth requireAdmin() at top of POST handler (segment layout already gates dashboard)"
  - "Validated body with Zod z.object({ reviewed: z.boolean() }) per CONTEXT D-04 / Claude's discretion"
  - "Validated submissionId path param with /^[a-f0-9-]{36}$/i UUID regex (matches demos/[jti] pattern)"
  - "Created sibling service-client.ts (option (a) from PATTERNS Pattern Note) instead of splitting or polluting service.ts — least disruptive"
  - "Mutation invalidates teachKeys.all (not just submission(id)) so cohort matrix + learner page also refresh — REV-02 requirement"
  - "No optimistic update in v1 — D-04b defers to later if profiling shows slowness"
  - "No toast logic in mutationOptions — consumer component (Plan 06) owns toasts via onSuccess/onError overrides"
metrics:
  duration: "2 min"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  completed_date: "2026-04-29"
---

# Phase 3 Plan 02: Mark-Reviewed Route + Mutation Surface Summary

End-to-end mark-as-reviewed mutation infrastructure: a server-side POST route handler that toggles `submissions.reviewed_at` / `reviewed_by` via the user-session Supabase client (D-04a), a client-callable transport in `service-client.ts`, and a typed `markReviewedMutation` that invalidates `teachKeys.all` on success.

## What Shipped

Three new files (zero modifications to existing files — Phase 1 contracts and queries factory stay locked):

### 1. `src/app/api/teach/submissions/[id]/review/route.ts` (NEW)

POST handler with three security gates layered:

1. `await requireAdmin()` — defense-in-depth redirect on non-admin (segment layout already gates `/dashboard/teach`, but this handler is reachable from anywhere a session cookie is present).
2. `await supabase.auth.getUser()` — returns 401 on no session.
3. RLS `USING(is_admin())` + Phase-1 column-level GRANT — Postgres-side enforcement of admin-only writes and the `(reviewed_at, reviewed_by)` column whitelist.

Body validated with `z.object({ reviewed: z.boolean() })` via `safeParse` → 400 on invalid.
Path param validated with `/^[a-f0-9-]{36}$/i` UUID regex → 400 on malformed.
Returns `MarkReviewedResponse` (`Pick<SubmissionSummary, 'id' | 'reviewedAt' | 'reviewedBy'>`).

`reviewed: true` → `{ reviewed_at: now(), reviewed_by: auth.uid() }`.
`reviewed: false` → `{ reviewed_at: null, reviewed_by: null }` (REV-03 undo).

### 2. `src/features/teach/api/service-client.ts` (NEW)

Single export: `markReviewed(input: MarkReviewedInput): Promise<MarkReviewedResponse>`.
Thin `apiClient<T>` wrapper that POSTs JSON `{ reviewed }` to `/api/teach/submissions/${encodeURIComponent(id)}/review`.

**Why sibling instead of adding to `service.ts`:** `service.ts` carries `import 'server-only'` at the top so Next.js code-splits it out of the client bundle. Adding a client-callable function there would either break the server-only enforcement (when re-imported by `mutations.ts` in a `'use client'` component tree) or require splitting the file. Per PATTERNS.md Pattern Note option (a), a NEW sibling file with no `'server-only'` directive is the least disruptive choice — `service.ts` stays untouched, server-only purity is preserved, and the existing demos pattern is mirrored.

### 3. `src/features/teach/api/mutations.ts` (NEW)

`markReviewedMutation` exported via `mutationOptions<MarkReviewedResponse, Error, MarkReviewedInput>`.
On success, invalidates the entire teach key tree (`teachKeys.all`).

**Why `teachKeys.all` (not just `teachKeys.submission(id)`):** REV-02 requires the cohort matrix and learner page to also refresh after a review change. The Phase 2 cohort matrix derives `state: 'reviewed' | 'submitted'` from `submissions.reviewed_at`, so a write must invalidate that cached query too. `teachKeys.all = ['teach']` invalidates every cached query under that root in one shot — same shape as demos uses (`demoKeys.all`).

**No toast / no optimistic update:** Toast logic stays in the consumer component (Plan 06's `<MarkReviewedButton>` will override `onSuccess`/`onError`). Optimistic update is deferred to v2 per D-04b.

## Note for Plan 06

Consumer wires this with:

```typescript
import { markReviewedMutation } from '@/features/teach/api/mutations';
import type { MarkReviewedInput } from '@/features/teach/api/types';

const mutation = useMutation({
  ...markReviewedMutation,
  onSuccess: (_data, vars) =>
    toast.success(vars.reviewed ? 'Submission marked as reviewed' : 'Review undone'),
  onError: (err) => toast.error(err.message)
});

mutation.mutate({ submissionId: '...', reviewed: true });
```

## Verification

- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0; new route appears in build output as `ƒ /api/teach/submissions/[id]/review`. No bundling errors — confirms `service-client.ts` and `mutations.ts` are safe in the client bundle (they do not pull in `service.ts`).
- All Task 1 + Task 2 acceptance criteria pattern grep checks pass.
- Migration `supabase/migrations/00010_add_submissions_review_columns.sql` confirmed present locally; STATE.md notes it's also LIVE in production with the column-level GRANT + RLS active.

## Threat Mitigation Confirmation

All STRIDE threats from `<threat_model>` (T-03-07..T-03-15) are mitigated as planned:

- **T-03-07** (Spoofing non-admin): `requireAdmin()` + `supabase.auth.getUser()` 401 + RLS USING(is_admin()) — three layers.
- **T-03-08** (Tampering non-review columns): Phase-1 column-level GRANT rejects at PostgREST parser; server code only writes whitelisted columns.
- **T-03-09** (Repudiation): `reviewed_by = auth.uid()` from user-session client — audit trail in column.
- **T-03-10** (apiClient error message leak): apiClient throws generic `API error: <status> <statusText>` — no internal details leak. Acceptable per UI-SPEC.
- **T-03-11** (DoS): No rate limit added — admin-only, low-cardinality user pool, accept.
- **T-03-12** (EoP cross-tenant): Single-tenant + RLS gates row-level access regardless of id.
- **T-03-13** (Tampering Zod bypass): `safeParse` + TS narrowing.
- **T-03-14** (IDOR enumeration): UUID regex + RLS + unguessable IDs.
- **T-03-15** (CSRF): Same-origin Route Handlers + `SameSite=Lax` session cookies + no CORS headers.

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed atomically with the scaffolds from `<action>` blocks (which were composites of demos analogs from PATTERNS.md). No auto-fixes needed; no architectural decisions surfaced.

## Self-Check: PASSED

**Files verified to exist:**

- FOUND: `src/app/api/teach/submissions/[id]/review/route.ts`
- FOUND: `src/features/teach/api/service-client.ts`
- FOUND: `src/features/teach/api/mutations.ts`

**Commits verified to exist in git log:**

- FOUND: `e0c98a78` — `feat(03-02): add POST /api/teach/submissions/[id]/review route handler`
- FOUND: `429489e2` — `feat(03-02): add markReviewed transport + markReviewedMutation`
