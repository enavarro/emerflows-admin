---
phase: 03
plan: 04
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx
  - src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx
  - src/features/teach/components/learner-detail.tsx
requirements: [LRN-01, LRN-02, LRN-03]
autonomous: true
tags: [ui, route, rsc, hydration, learner-page]

must_haves:
  truths:
    - "Hitting GET /dashboard/teach/cohorts/spring-2026/learners/<id> as admin renders 200 with the learner's name as page title"
    - "The page renders one Card per module the learner has touched, sorted by module number ascending (D-05, D-08)"
    - "Within each module Card, submission rows are sorted newest-attempt-first (submittedAt DESC, attemptNum DESC tiebreaker per D-05)"
    - "Each submission row is clickable and links to /dashboard/teach/submissions/[id]"
    - "When learner has zero submissions, an empty state with Icons.forms renders inside the body slot (not the page header)"
    - "Non-admin users hitting this URL are redirected by requireAdmin() before any rendering"
  artifacts:
    - path: "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx"
      provides: "RSC route with fetchQuery prefetch + HydrationBoundary + Suspense + PageContainer header"
      contains: "fetchQuery"
    - path: "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx"
      provides: "Per-route error boundary using Alert primitive"
      exports: ["default"]
    - path: "src/features/teach/components/learner-detail.tsx"
      provides: "Client component that consumes learnerQueryOptions via useSuspenseQuery and renders module cards"
      exports: ["LearnerDetail"]
  key_links:
    - from: "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx"
      to: "src/features/teach/api/service.ts:getLearner"
      via: "queryClient.fetchQuery({ queryKey: teachKeys.learner(learnerId), queryFn: () => getLearner(learnerId) })"
      pattern: "getLearner\\("
    - from: "src/features/teach/components/learner-detail.tsx"
      to: "src/features/teach/api/queries.ts:learnerQueryOptions"
      via: "useSuspenseQuery(learnerQueryOptions(learnerId))"
      pattern: "useSuspenseQuery\\(learnerQueryOptions"
    - from: "submission row in learner-detail.tsx"
      to: "/dashboard/teach/submissions/[id]"
      via: "Next.js Link with stretched-link pattern"
      pattern: "/dashboard/teach/submissions/"
---

<objective>
Build the learner detail page surface (UI-SPEC §Surface 1). Create three new files:
1. RSC route at `/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx` that prefetches via `fetchQuery` + hydrates a client component.
2. Per-route error boundary at the same path (`error.tsx`).
3. Client component `learner-detail.tsx` that renders the cards-per-module layout per D-05 / D-08.

Purpose: Closes the LRN-01 / LRN-02 / LRN-03 requirements. Page header carries the learner's name + cohort/level badges (D-09); body shows one Card per module the learner has touched, with clickable rows linking to the submission viewer (Plan 05's domain).

Output: Three new files. Header pre-resolves via `fetchQuery` so `pageTitle` shows the learner's name without a "Loading…" flash.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-learner-deep-dive-review/03-CONTEXT.md
@.planning/phases/03-learner-deep-dive-review/03-PATTERNS.md
@.planning/phases/03-learner-deep-dive-review/03-UI-SPEC.md
@src/features/teach/api/types.ts
@src/features/teach/api/queries.ts
@src/features/teach/constants/modules.ts
@src/features/teach/components/cohort-detail.tsx
@src/features/teach/components/learners-table.tsx
@src/app/dashboard/teach/cohorts/[cohort]/page.tsx
@src/app/dashboard/teach/cohorts/[cohort]/error.tsx
@src/components/layout/page-container.tsx
@src/components/icons.tsx
@CLAUDE.md

<interfaces>
<!-- LOCKED contracts from Phase 1 + Plan 01 -->

From src/features/teach/api/types.ts:
```typescript
export interface LearnerDetail {
  learner: LearnerRow;
  submissionsByModule: Record<string, SubmissionSummary[]>;
}
export interface SubmissionSummary {
  id: string;
  learnerId: string;
  moduleId: string;
  type: ModuleType; // 'recording' | 'conversation'
  attemptNum: 1 | 2;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}
export interface LearnerRow {
  id: string;
  name: string;
  cohort: string;
  level?: string;
  externalId?: string;
  // ...
}
```

From src/features/teach/api/queries.ts:
```typescript
export const teachKeys = { all, cohorts, cohort, learner, submission };
export const learnerQueryOptions: (learnerId: string) => QueryOptions<LearnerDetail>;
```

From src/features/teach/api/service.ts (after Plan 01):
```typescript
export async function getLearner(learnerId: string): Promise<LearnerDetail>;
```

From src/features/teach/constants/modules.ts:
```typescript
export const MODULES: readonly ModuleDef[];  // num, id, title, types
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create RSC route page.tsx + error.tsx for learner detail</name>

  <read_first>
    - src/app/dashboard/teach/cohorts/[cohort]/page.tsx (analog: full file 87 lines — copy structure exactly, swap params + query)
    - src/app/dashboard/teach/cohorts/[cohort]/error.tsx (analog: full file 19 lines — copy verbatim, change AlertTitle copy)
    - .planning/phases/03-learner-deep-dive-review/03-PATTERNS.md (§ "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx (NEW)" — header strategy + fetchQuery decision)
    - .planning/phases/03-learner-deep-dive-review/03-UI-SPEC.md (§ Surface 1 — page header + external_id supplemental display)
    - .planning/phases/03-learner-deep-dive-review/03-CONTEXT.md (D-09 profile summary; LRN-01)
  </read_first>

  <files>src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx, src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx</files>

  <action>
Create the directory tree `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/` and two files inside.

**File 1 — `page.tsx`** (RSC route, copies the shape of `src/app/dashboard/teach/cohorts/[cohort]/page.tsx`):

```typescript
import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { teachKeys } from '@/features/teach/api/queries';
import { getLearner } from '@/features/teach/api/service';
import { LearnerDetail } from '@/features/teach/components/learner-detail';

export const metadata = {
  title: 'Learner — Teach Admin'
};

interface LearnerDetailPageProps {
  params: Promise<{ cohort: string; learnerId: string }>;
}

export default async function LearnerDetailPage({ params }: LearnerDetailPageProps) {
  const { learnerId } = await params;
  // Defense-in-depth: layout already gates, but page-level guard is belt-and-suspenders.
  await requireAdmin();

  // PATTERNS.md §React Query Server-Prefetch: use fetchQuery (NOT prefetchQuery)
  // so errors propagate to error.tsx and the resolved data populates both
  // the cache (for HydrationBoundary) AND a local variable for the
  // PageContainer header (avoids a "Loading…" flash on title).
  const queryClient = getQueryClient();
  const learnerDetail = await queryClient.fetchQuery({
    queryKey: teachKeys.learner(learnerId),
    queryFn: () => getLearner(learnerId)
  });

  // UI-SPEC §Surface 1 page header contract:
  //   pageTitle:       learner.name (e.g. "Ana García")
  //   pageDescription: "{cohort} · {level || '—'}"
  //   external_id:     supplemental <p> below header (only when non-null)
  const description = `${learnerDetail.learner.cohort} · ${learnerDetail.learner.level ?? '—'}`;

  return (
    <PageContainer
      pageTitle={learnerDetail.learner.name}
      pageDescription={description}
    >
      {learnerDetail.learner.externalId && (
        <p className='text-muted-foreground mt-1 font-mono text-xs'>
          {learnerDetail.learner.externalId}
        </p>
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<LearnerDetailBodySkeleton />}>
          <LearnerDetail learnerId={learnerId} />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

function LearnerDetailBodySkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-32 w-full rounded-lg' />
      <Skeleton className='h-32 w-full rounded-lg' />
    </div>
  );
}
```

**File 2 — `error.tsx`** (copy `src/app/dashboard/teach/cohorts/[cohort]/error.tsx` verbatim, change AlertTitle copy):

```typescript
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';

export default function LearnerDetailError({ error }: { error: Error }) {
  return (
    <div className='p-4 md:px-6'>
      <Alert variant='destructive'>
        <Icons.alertCircle className='h-4 w-4' aria-hidden='true' />
        <AlertTitle>Could not load learner</AlertTitle>
        <AlertDescription>
          Refresh the page to try again. If the problem persists, contact support.
          {error?.message ? ` (${error.message})` : ''}
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

**CRITICAL:**
- Use `fetchQuery`, NOT `prefetchQuery` (PATTERNS.md §React Query Server-Prefetch — `prefetchQuery` swallows errors).
- The `params` is a Promise (Next.js 16 App Router convention) — destructure after `await params`.
- The `cohort` param is in the URL but we don't use it in the page — it's there because the route nests under `[cohort]/`. Take only `learnerId`.
- Pre-resolving `learnerDetail` and re-using it for both the header AND the cache hydration is the canonical pattern (PATTERNS.md "Recommendation: option 2").
- The `LearnerDetail` client component (Task 2) will read from the cache via `useSuspenseQuery(learnerQueryOptions(learnerId))` — synchronous, no extra fetch.
- `LearnerDetailBodySkeleton` only fills the body region — header is rendered statically at the route level.

**Code style (CLAUDE.md LOCKED):** single quotes, JSX single quotes, no trailing comma, 2-space indent, semicolons required, arrow with parens, `@/` imports only.

**DO NOT:**
- Use `prefetchQuery` (silently swallows errors).
- Wrap the PageContainer inside Suspense (header must be stable).
- Render the empty-state UI here — that lives in the client component (Task 2) so we can read `submissionsByModule` length.
- Use `'use client'` on `page.tsx` (must remain RSC).
- Add `Heading` imports (project rule: PageContainer owns the header).
  </action>

  <verify>
    <automated>test -f "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx" && test -f "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx" && grep -n "queryClient.fetchQuery" "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx" && ! grep -n "prefetchQuery" "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx" && grep -n "await requireAdmin" "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx" && grep -n "Could not load learner" "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx" && npx tsc --noEmit</automated>
  </verify>

  <acceptance_criteria>
    - File `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx` exists
    - File `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx` exists
    - `page.tsx` contains `await requireAdmin(`
    - `page.tsx` contains `queryClient.fetchQuery(`
    - `page.tsx` does NOT contain `prefetchQuery` (anti-pattern)
    - `page.tsx` contains `teachKeys.learner(learnerId)`
    - `page.tsx` contains `queryFn: () => getLearner(learnerId)`
    - `page.tsx` contains `<HydrationBoundary state={dehydrate(queryClient)}>`
    - `page.tsx` contains `<Suspense fallback={<LearnerDetailBodySkeleton`
    - `page.tsx` contains `pageTitle={learnerDetail.learner.name}`
    - `page.tsx` contains `learnerDetail.learner.externalId &&` (conditional render)
    - `page.tsx` contains `font-mono text-xs` (external_id styling per UI-SPEC)
    - `error.tsx` contains `'use client'`
    - `error.tsx` contains `Could not load learner`
    - `error.tsx` contains `Icons.alertCircle`
    - `npx tsc --noEmit` exits with code 0
  </acceptance_criteria>

  <done>
    Route renders for an admin user with a real learner ID. The page header shows the learner's name + cohort/level + (when present) external_id. The body region has a Suspense fallback that resolves to the LearnerDetail client component (Task 2). Errors thrown by `getLearner` propagate to `error.tsx` instead of falling through to the missingPrefetch placeholder.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create learner-detail.tsx client component with module cards + empty state</name>

  <read_first>
    - src/features/teach/components/cohort-detail.tsx (analog: useSuspenseQuery shape, lines 1-50)
    - src/features/teach/components/cohorts-listing.tsx (analog: empty state pattern, lines 12-25)
    - src/features/teach/components/learners-table.tsx (analog: stretched-link row pattern, lines 53-67)
    - .planning/phases/03-learner-deep-dive-review/03-PATTERNS.md (§ "src/features/teach/components/learner-detail.tsx (NEW)" — full scaffold including module sort, row sort, and stretched-link pattern)
    - .planning/phases/03-learner-deep-dive-review/03-UI-SPEC.md (§ Surface 1 — module card layout, submission row structure, empty state, badges)
    - .planning/phases/03-learner-deep-dive-review/03-CONTEXT.md (D-05, D-08: cards per module, sort newest-first, only modules with submissions)
    - src/components/ui/card.tsx, src/components/ui/badge.tsx, src/components/ui/separator.tsx (UI primitives)
  </read_first>

  <files>src/features/teach/components/learner-detail.tsx</files>

  <action>
Create a new client component file. It receives a `learnerId` prop, reads the prefetched cache via `useSuspenseQuery(learnerQueryOptions(learnerId))`, and renders either the empty state or the cards-per-module layout.

**Full file content:**

```typescript
'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useSuspenseQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { learnerQueryOptions } from '@/features/teach/api/queries';
import { MODULES } from '@/features/teach/constants/modules';
import type { SubmissionSummary } from '@/features/teach/api/types';

interface LearnerDetailProps {
  learnerId: string;
}

export function LearnerDetail({ learnerId }: LearnerDetailProps) {
  const { data: learnerDetail } = useSuspenseQuery(learnerQueryOptions(learnerId));
  const { submissionsByModule } = learnerDetail;

  // D-08: render only modules where the learner has at least one submission.
  // Empty state: zero modules → centered message with Icons.forms (UI-SPEC §Surface 1).
  const moduleIds = Object.keys(submissionsByModule);
  if (moduleIds.length === 0) {
    return (
      <div className='bg-card flex flex-col items-center justify-center gap-3 rounded-md border py-12 text-center'>
        <Icons.forms className='text-muted-foreground h-8 w-8' aria-hidden='true' />
        <h2 className='text-brand-teal text-lg font-semibold'>No submissions yet</h2>
        <p className='text-muted-foreground max-w-sm text-sm'>
          This learner has not submitted any work yet.
        </p>
      </div>
    );
  }

  // D-05: sort modules by num ascending. Unknown moduleIds (defensive) sort last.
  const sortedModuleIds = moduleIds.toSorted((a, b) => {
    const ma = MODULES.find((m) => m.id === a)?.num ?? 99;
    const mb = MODULES.find((m) => m.id === b)?.num ?? 99;
    return ma - mb;
  });

  return (
    <div className='flex flex-col gap-4'>
      {sortedModuleIds.map((moduleId) => {
        const mod = MODULES.find((m) => m.id === moduleId);
        const code = mod ? `M${String(mod.num).padStart(2, '0')}` : moduleId;
        const title = mod?.title ?? '';
        // D-05 row sort: submittedAt DESC, attemptNum DESC tiebreaker.
        const subs = submissionsByModule[moduleId].toSorted((a, b) => {
          const tsCmp = (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
          return tsCmp !== 0 ? tsCmp : b.attemptNum - a.attemptNum;
        });
        return (
          <Card key={moduleId}>
            <CardHeader>
              <h2 className='text-brand-teal text-base font-semibold'>
                {code} · {title}
              </h2>
            </CardHeader>
            <CardContent className='flex flex-col'>
              {subs.map((submission, i) => (
                <div key={submission.id}>
                  {i > 0 && <Separator />}
                  <SubmissionRow submission={submission} />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface SubmissionRowProps {
  submission: SubmissionSummary;
}

// Stretched-link pattern from learners-table.tsx lines 53-67: single <Link>
// per row, after:absolute after:inset-0 expands the click target to the
// whole row, parent gets `relative`. Single keyboard stop per row.
function SubmissionRow({ submission }: SubmissionRowProps) {
  const href = `/dashboard/teach/submissions/${submission.id}`;
  const dateLabel = formatSubmittedAt(submission.submittedAt);
  return (
    <div className='hover:bg-brand-cream relative flex flex-wrap items-center gap-2 py-3 transition'>
      <Link
        href={href}
        aria-label={`Open submission ${submission.id}`}
        className='focus-visible:ring-brand-teal after:absolute after:inset-0 focus:outline-none focus-visible:ring-2'
      >
        <span className='sr-only'>Open submission</span>
      </Link>
      <Badge variant='outline'>
        {submission.type === 'recording' ? 'Recording' : 'Conversation'}
      </Badge>
      <Badge variant='secondary'>Att {submission.attemptNum}</Badge>
      <Badge variant='outline'>{submission.status}</Badge>
      {submission.reviewedAt ? (
        <Badge className='bg-brand-sage/20 text-brand-teal border-brand-sage'>
          Reviewed
        </Badge>
      ) : (
        <Badge variant='outline' className='text-muted-foreground'>
          Needs review
        </Badge>
      )}
      <span className='text-muted-foreground ml-auto text-sm'>{dateLabel}</span>
    </div>
  );
}

function formatSubmittedAt(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy');
}
```

**CRITICAL:**
- `'use client'` directive on line 1 (required for hooks).
- `useSuspenseQuery` resolves SYNCHRONOUSLY because Plan 01's `getLearner` data was cache-warmed by Task 1's `fetchQuery` + `dehydrate`. No `missingPrefetch` placeholder is invoked.
- D-05 row sort: `submittedAt DESC`, `attemptNum DESC` tiebreaker. Use `String#localeCompare` reversed (b vs a) for the timestamp string.
- D-08: only modules in `submissionsByModule` keys are rendered. The `MODULES.find(...)` is for the title lookup, not for filtering.
- Stretched-link pattern is critical for accessibility: ONE `<Link>` per row with `after:absolute after:inset-0`. Do NOT add `<Link>` wrappers around badges or the date span — that would create multiple keyboard stops.
- Date format `MMM d, yyyy` matches PATTERNS.md §Date Formatting (locked across Phase 2/3).
- Reviewed badge: `bg-brand-sage/20 text-brand-teal border-brand-sage` — sage 20%-opacity background tinted with teal text, sage border. Per UI-SPEC §Color "Reviewed indicator".
- Empty state copy and structure match UI-SPEC §Surface 1 §"Empty state". Use `Icons.forms` (which is `IconClipboardText` per the registry — UI-SPEC names it `clipboardList` but the registry alias is `forms`; PATTERNS.md §Icon Imports confirms this mapping).

**Code style (CLAUDE.md LOCKED):** single quotes, JSX single quotes, no trailing comma, 2-space indent, semicolons required, arrow with parens, `@/` imports only. Icons ONLY from `@/components/icons`.

**DO NOT:**
- Import any icon directly from `@tabler/icons-react`.
- Add navigation, action buttons, or filters to this page (out of scope per CONTEXT.md).
- Render module cards for modules the learner has not touched (D-08).
- Sort `MODULES` itself — only iterate over the keys present in `submissionsByModule`.
- Put more than one `<Link>` in a row.
- Use a `<table>` — UI-SPEC §Surface 1 specifies cards-per-module, not a table.
  </action>

  <verify>
    <automated>test -f src/features/teach/components/learner-detail.tsx && grep -n "'use client'" src/features/teach/components/learner-detail.tsx && grep -n "useSuspenseQuery(learnerQueryOptions" src/features/teach/components/learner-detail.tsx && grep -n "submissionsByModule" src/features/teach/components/learner-detail.tsx && grep -n "after:absolute after:inset-0" src/features/teach/components/learner-detail.tsx && grep -n "/dashboard/teach/submissions/" src/features/teach/components/learner-detail.tsx && grep -n "No submissions yet" src/features/teach/components/learner-detail.tsx && grep -n "Icons.forms" src/features/teach/components/learner-detail.tsx && ! grep -n "@tabler/icons-react" src/features/teach/components/learner-detail.tsx && npx tsc --noEmit && npm run build</automated>
  </verify>

  <acceptance_criteria>
    - File `src/features/teach/components/learner-detail.tsx` exists
    - First non-comment line is `'use client';`
    - Contains `export function LearnerDetail(`
    - Contains `useSuspenseQuery(learnerQueryOptions(learnerId))`
    - Contains `submissionsByModule` (the grouping access)
    - Contains `Object.keys(submissionsByModule)` for empty-state and iteration
    - Contains `MODULES.find((m) => m.id ===` (module lookup for title)
    - Contains `String(mod.num).padStart(2, '0')` (M01-format zero-padding)
    - Contains `.toSorted(` at least twice (modules + rows)
    - Contains `after:absolute after:inset-0` (stretched-link pattern)
    - Contains `/dashboard/teach/submissions/` (link target)
    - Contains `format(date, 'MMM d, yyyy')` (locked date format)
    - Contains `No submissions yet` (empty-state copy per UI-SPEC)
    - Contains `Icons.forms` (per UI-SPEC empty state — registry alias for clipboardList)
    - Contains `bg-brand-sage/20 text-brand-teal border-brand-sage` (Reviewed badge style per UI-SPEC §Color)
    - Does NOT contain `@tabler/icons-react` (icons only via registry)
    - Does NOT contain `import { Heading }` (PageContainer owns the header)
    - `npx tsc --noEmit` exits with code 0
    - `npm run build` exits with code 0
  </acceptance_criteria>

  <done>
    Visiting `/dashboard/teach/cohorts/spring-2026/learners/<id>` as admin renders the learner page: header shows name + cohort + level + (when present) external_id; body shows one Card per module with submissions, sorted by module number; rows show type/attempt/status/reviewed badges + date; clicking a row navigates to the (Plan 05) submission viewer route. Empty learner shows the centered "No submissions yet" message.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → RSC route | Untrusted; gated server-side by `requireAdmin()` (redirects to `/auth/sign-in` or `/dashboard/overview?denied=teach`) |
| RSC route → Plan-01 service | Trusted in-process; service is server-only |
| Hydration boundary → client component | Trusted same-process serialization |
| Client component → submission viewer (via Link) | Same-origin Next.js navigation |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-18 | Spoofing | non-admin hitting `/dashboard/teach/cohorts/[cohort]/learners/[learnerId]` | mitigate | `await requireAdmin()` at top of page.tsx + segment layout already gates `/dashboard/teach/*` |
| T-03-19 | Information Disclosure | learner uuid in URL | accept | UUIDs are unguessable; admin-only context; PROJECT.md single-tenant model — no cross-tenant leak surface |
| T-03-20 | Tampering | learnerId path param injection | mitigate | Supabase parameterized query in `getLearner` (Plan 01); no string concat into SQL; `.eq('id', learnerId)` is type-safe |
| T-03-21 | Information Disclosure | error.tsx leaking error.message | accept | error.message bubble shows truncated detail to admin only — acceptable per Phase 2 precedent (cohort error.tsx does the same) |
| T-03-22 | XSS | learner name / status / module title rendered into JSX | mitigate | React escapes by default; no `dangerouslySetInnerHTML`; data sourced from Supabase (admin-controlled values) — defense-in-depth via React escaping |
</threat_model>

<verification>
After both tasks complete:

1. `npx tsc --noEmit` → exit 0
2. `npm run build` → exit 0 (validates that the route + client component bundle correctly)
3. Manual smoke (per CONTEXT.md "Test coverage" line — Phase 4 owns Playwright):
   - Sign in as admin
   - Navigate to `/dashboard/teach/cohorts/spring-2026` (Phase 2 page)
   - Click any learner row → arrives at the new learner page
   - Verify name in header, cohort + level in description
   - Verify at least one Card per module the learner has submitted to
   - Verify submission rows show type / attempt / status / reviewed badges
   - Click a row → navigates to `/dashboard/teach/submissions/<id>` (Plan 05's URL — may 404 until Plan 05 is implemented; that's fine for Plan 04's smoke)
4. Sign in as non-admin → navigating to the URL redirects to `/dashboard/overview?denied=teach`.
</verification>

<success_criteria>
- All three files exist with the structures specified
- TypeScript and build pass
- Page renders for admin, redirects non-admin
- Module cards group submissions correctly per D-05 / D-08
- Empty state shows when learner has zero submissions
- Stretched-link pattern wires rows to the (Plan 05) submission viewer URL
</success_criteria>

<output>
After completion, create `.planning/phases/03-learner-deep-dive-review/03-04-SUMMARY.md` documenting:
- The new files and their roles
- How the page header pre-resolves to avoid loading flash
- The D-05 / D-08 sorting and filtering decisions in code
- A note for Plan 05/06: the submission viewer URL `/dashboard/teach/submissions/[id]` is the navigation target
</output>
