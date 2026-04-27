# Phase 2: Cohorts Hub - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 9 (8 source + 1 test)
**Analogs found:** 9 / 9 (every file has an in-repo analog)

> Source of file list: `02-CONTEXT.md` (`<canonical_refs>` + `## Integration Points`) and `02-UI-SPEC.md` (Allowed primitives table). All file roles + data flows derived from CONTEXT.md decisions D-01..D-19 and UI-SPEC interaction contract.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/teach/api/service.ts` (REPLACE stubs only) | service (server-only data access) | request-response (Supabase reads → typed contracts) | `src/lib/supabase/admin.ts` (admin client + server-only marker), Phase-1 stub already in file | role-match (no existing teach service body to copy — admin client is the dependency analog) |
| `src/app/dashboard/teach/cohorts/page.tsx` (REPLACE) | route (RSC prefetch + hydration boundary) | request-response (server prefetch → client suspense) | `src/features/users/components/user-listing.tsx` + `src/features/demos/components/demos-listing.tsx` | exact (canonical RSC pattern referenced in CONTEXT.md) |
| `src/app/dashboard/teach/cohorts/[cohort]/page.tsx` (NEW) | route (dynamic-segment RSC prefetch) | request-response | `src/features/demos/components/demos-listing.tsx` (RSC prefetch shape) | exact-shape, role-match for dynamic param |
| `src/features/teach/components/cohorts-listing.tsx` (NEW) | component (client, suspense consumer) | request-response (`useSuspenseQuery`) | `src/features/demos/components/tokens-table.tsx` (suspense + empty state) | exact (suspense consumer pattern) |
| `src/features/teach/components/cohort-card.tsx` (NEW) | component (presentational) | none (props only) | shadcn `Card` primitive (`src/components/ui/card.tsx`) + prototype `CohortCard` (`teacher-admin/teacher-admin.jsx` lines 101–159) | role-match (port prototype IA into shadcn primitives) |
| `src/features/teach/components/cohort-detail.tsx` (NEW) | component (client, tabs wrapper) | request-response (`useSuspenseQuery` on `cohortQueryOptions`) | `src/features/demos/components/tokens-table.tsx` + shadcn `Tabs` primitive | exact (suspense + tabs composition) |
| `src/features/teach/components/learners-table.tsx` (NEW) | component (client, table list) | request-response (consumes parent's `cohortDetail`) | `src/features/demos/components/tokens-table.tsx` (raw shadcn `<Table>`, no DataTable) | exact (CONTEXT.md says plain table, no nuqs in v1) |
| `src/features/teach/components/progress-matrix.tsx` (NEW) | component (client, sticky-header grid) | none (props only — receives `cohortDetail.matrix`) | shadcn `Table` primitive (`src/components/ui/table.tsx`) + `DataTable` sticky-header pattern (`src/components/ui/table/data-table.tsx` lines 27–46) | role-match (custom sticky matrix, not DataTable) |
| `tests/e2e/teach-cohorts.spec.ts` (NEW) | test (Playwright e2e) | request-response (browser → app) | `tests/e2e/teach-nav.spec.ts` | exact (same auth helper, same dashboard surface) |

---

## Pattern Assignments

### `src/features/teach/api/service.ts` — service (server-only)

**Analogs:**
- Service-marker + Supabase admin client: `src/lib/supabase/admin.ts`
- Existing stub-shape contract: same file (already wired with `import 'server-only'` and the type-imports — DO NOT MODIFY the marker, type-imports, or `getLearner`/`getSubmission` stubs).

**Imports pattern** — keep the existing top of the file (already in repo):
```typescript
// service.ts lines 1–18 (already present, DO NOT change)
import 'server-only';

import type {
  Cohort,
  CohortDetail,
  LearnerDetail,
  SubmissionDetail
} from './types';
```

**ADD this import** (FND-05 admin client):
```typescript
// add to import block
import { createAdminClient } from '@/lib/supabase/admin';
```

**Admin-client usage pattern** (canonical, from `src/lib/supabase/admin.ts` lines 35–57):
```typescript
const cachedAdminClient: SupabaseClient | null = null;
// ... env-var validation ...
cachedAdminClient = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});
```
> Service body MUST call `createAdminClient()` (singleton helper) — do NOT instantiate `createClient` directly. Service-role key is owned by `admin.ts` only.

**Query + error handling pattern** (from `src/lib/supabase/admin.ts` lines 86–96 — pattern of `await client...; if (error || !data) throw new Error(...)`):
```typescript
const client = createAdminClient();
const { data, error } = await client.storage
  .from(RECORDINGS_BUCKET)
  .createSignedUrl(path, ttlSec);

if (error || !data) {
  throw new Error(`Failed to sign recording URL: ${error?.message ?? 'unknown error'}`);
}
```
> Apply the same `if (error) throw new Error(...)` shape inside `getCohorts` and `getCohort` for each Supabase call — fail loudly so the route's `error.tsx` boundary surfaces issues.

**Two-trip aggregate pattern** — D-01 mandates:
1. `from('learners').select('cohort, id').not('cohort', 'is', null)` then group in JS to derive `learnerCount` per distinct cohort.
2. `from('submissions').select('learner_id, module_id, type, reviewed_at').in('learner_id', allLearnerIds)` then aggregate `totalSubmissions` (DISTINCT `(learner_id, module_id, type)` per D-02), `needsReview` (D-03), `reviewed` (D-04) per cohort in Node.

**`getCohort(cohortId)` matrix-build pattern** — D-05 mandates:
- Per `(learner, module)` keep the LATEST submission only.
- Iterate `MODULES` (from `@/features/teach/constants/modules.ts`) in `num` order to build each learner's `ModuleProgressCell[]`.
- Cell state: no row → `not-started`; `reviewed_at IS NULL` → `submitted`; otherwise → `reviewed`.

**LOCKED — do NOT change:**
- `import 'server-only'` line
- Type imports from `./types`
- The two unimplemented stubs `getLearner`, `getSubmission` (Phase 3 owns them)
- Function signatures of `getCohorts()` and `getCohort(cohortId)` — type contracts are immutable per Phase 1.

---

### `src/app/dashboard/teach/cohorts/page.tsx` — route (RSC prefetch)

**Analog:** `src/features/users/components/user-listing.tsx` (RSC prefetch + dehydrate) + the existing `src/app/dashboard/teach/cohorts/page.tsx` (REPLACE its body but keep the `requireAdmin()` defense-in-depth call).

**Imports pattern** (from `src/features/users/components/user-listing.tsx` lines 1–5):
```typescript
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
// ...
import { usersQueryOptions } from '../api/queries';
import { UsersTable } from './users-table';
```

**Defense-in-depth gate** (from existing `src/app/dashboard/teach/cohorts/page.tsx` lines 1–11 — KEEP THIS):
```typescript
import { requireAdmin } from '@/lib/auth/require-admin';

export const metadata = {
  title: 'Cohorts — Teach Admin'
};

export default async function CohortsPage() {
  const { user } = await requireAdmin();
  // ...
}
```

**Prefetch + hydrate pattern** (from `src/features/demos/components/demos-listing.tsx` lines 8–25 — canonical):
```typescript
export default function DemosListingPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tokensQueryOptions());
  void queryClient.prefetchQuery(spendQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='space-y-6'>
        <Suspense fallback={<div className='bg-muted h-24 animate-pulse rounded-md' />}>
          <SpendGauge />
        </Suspense>
        <Suspense fallback={<div className='bg-muted h-48 animate-pulse rounded-md' />}>
          <TokensTable />
        </Suspense>
      </div>
    </HydrationBoundary>
  );
}
```

**Page header pattern** (from `src/components/layout/page-container.tsx` lines 21–69) — D-14 mandates `PageContainer`:
```typescript
<PageContainer
  pageTitle='Cohorts'
  pageDescription='Browse cohorts and drill into a cohort to review learner progress.'
  pageHeaderAction={<>
    <Button variant='outline' disabled aria-disabled='true' title='Coming soon'>
      <Icons.upload className='mr-1 h-3 w-3' />
      Export
    </Button>
    <Button variant='default' disabled aria-disabled='true' title='Coming soon'>
      + New cohort
    </Button>
  </>}
>
  {/* HydrationBoundary + Suspense + <CohortsListing /> */}
</PageContainer>
```

**Sibling `error.tsx`** — pattern from `src/app/dashboard/overview/error.tsx` lines 1–14:
```typescript
'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';

export default function OverviewError({ error }: { error: Error }) {
  return (
    <Alert variant='destructive'>
      <Icons.alertCircle className='h-4 w-4' />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Failed to load statistics: {error.message}</AlertDescription>
    </Alert>
  );
}
```

---

### `src/app/dashboard/teach/cohorts/[cohort]/page.tsx` — route (dynamic RSC)

**Analog:** Same as above (`user-listing.tsx` + `demos-listing.tsx`), with the dynamic-param twist.

**Dynamic-param signature** (Next.js 16 App Router — `params` is async, see Next 15+ convention):
```typescript
export default async function CohortDetailPage({
  params
}: {
  params: Promise<{ cohort: string }>;
}) {
  const { cohort: cohortId } = await params;
  await requireAdmin(); // defense-in-depth, mirror cohorts/page.tsx

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(cohortQueryOptions(cohortId));

  return (
    <PageContainer
      pageTitle={/* cohort.name resolved client-side via useSuspenseQuery */ cohortId}
      pageDescription=''
      pageHeaderAction={<Button variant='outline' disabled title='Coming soon'>Export</Button>}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<CohortDetailSkeleton />}>
          <CohortDetail cohortId={cohortId} />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}
```
> Open question — D-14 says `pageTitle` = cohort.name. Since the title needs the resolved cohort, either (a) `await getCohort(cohortId)` server-side just for the title (extra trip), (b) defer to client component, or (c) accept the `cohortId` slug in the title until the suspense boundary resolves. Planner picks the cleanest path; pattern-mapper notes only the choices.

---

### `src/features/teach/components/cohorts-listing.tsx` — component (client suspense)

**Analog:** `src/features/demos/components/tokens-table.tsx` (suspense consumer + empty state).

**Imports + suspense pattern** (lines 1–28 of `tokens-table.tsx`):
```typescript
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
// ... primitives ...
import { tokensQueryOptions } from '../api/queries';

export function TokensTable() {
  const { data } = useSuspenseQuery(tokensQueryOptions());
  const tokens = data.tokens;
  // ...
}
```

**Empty-state pattern** (lines 44–50 of `tokens-table.tsx`):
```typescript
if (tokens.length === 0) {
  return (
    <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
      No active demo links. Click "New demo link" to mint one.
    </div>
  );
}
```
> Cohorts-listing empty copy locked in UI-SPEC: `No cohorts yet` + body `Cohorts appear here once learners are enrolled.` + `Icons.school` (32px, muted).

**Grid wrapper** — UI-SPEC §Visual Fidelity: CSS grid `repeat(auto-fill, minmax(340px, 1fr))` + `gap-6`:
```tsx
<div
  className='grid gap-6'
  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
>
  {cohorts.map((c) => <CohortCard key={c.id} cohort={c} />)}
</div>
```

---

### `src/features/teach/components/cohort-card.tsx` — component (presentational)

**Analog:** Prototype `CohortCard` (`teacher-admin/teacher-admin.jsx` lines 101–159) + shadcn `Card` (`src/components/ui/card.tsx`).

**Prototype IA to mirror** (`teacher-admin/teacher-admin.jsx` lines 101–159):
- Status pill (top-left) + level badge (top-right)
- Cohort name (Heading)
- Term hint (muted, below name)
- 2×2 stat grid: STUDENTS / COMPLETION / NEEDS REVIEW / NEXT
- Footer with `Open >` chevron affordance (entire card is the link)
- Hover lift `translateY(-2px)` + soft shadow

**shadcn Card composition** (from `src/components/ui/card.tsx`):
```typescript
<Card className='cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md'>
  <CardHeader>
    {/* status pill + level badge row */}
    {/* cohort name */}
    {/* term hint */}
  </CardHeader>
  <CardContent className='grid grid-cols-2 gap-2 text-sm'>
    {/* 4 stat cells */}
  </CardContent>
  <CardFooter className='flex justify-end text-xs text-brand-teal'>
    Open <Icons.chevronRight className='ml-1 h-3 w-3' />
  </CardFooter>
</Card>
```

**Whole-card-as-link pattern** — UI-SPEC §Interaction Contract row 1: wrap the `<Card>` in `<Link href={`/dashboard/teach/cohorts/${cohort.id}`}>` with `aria-label='Open {cohort.name}'`.

**Status pill pattern** — UI-SPEC §Visual Fidelity (Status pill): use `Badge variant='outline'` with a 6px `<span class='bg-brand-sage rounded-full'>` dot prefix + `text-xs uppercase tracking-wider` label. Single status value `Active` per D-07.

**Level badge** — `Badge variant='secondary'` with placeholder text `B1–B2` (D-08).

**Placeholder strings** (per D-08, D-09):
- Term hint: `cohort.termHint` if set, else `Spring 2026` literal.
- Completion: `0%` static.
- Next: `Module in progress` static.

**LOCKED**:
- Brand color rule: card uses `bg-card` (white) inheriting from primitive. Hover lift only — no `brand-sage` accent on cards (UI-SPEC §Color "Accent NOT used for: ... card hover").
- No teachers row (D-10).

---

### `src/features/teach/components/cohort-detail.tsx` — component (client tabs wrapper)

**Analog:** `src/features/demos/components/tokens-table.tsx` (suspense pattern) + shadcn `Tabs` (`src/components/ui/tabs.tsx`).

**Suspense pattern** (from `tokens-table.tsx` line 28):
```typescript
'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { cohortQueryOptions } from '../api/queries';

export function CohortDetail({ cohortId }: { cohortId: string }) {
  const { data: detail } = useSuspenseQuery(cohortQueryOptions(cohortId));
  // ...
}
```

**Tabs composition** (from `src/components/ui/tabs.tsx`):
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue='learners' className='flex flex-col gap-4'>
  <TabsList>
    <TabsTrigger value='learners'>Learners</TabsTrigger>
    <TabsTrigger value='matrix'>Progress matrix</TabsTrigger>
  </TabsList>
  <TabsContent value='learners'>
    <LearnersTable cohortDetail={detail} />
  </TabsContent>
  <TabsContent value='matrix'>
    <ProgressMatrix cohortDetail={detail} />
  </TabsContent>
</Tabs>
```
> Default active = `learners` (D-13).

---

### `src/features/teach/components/learners-table.tsx` — component (plain table list)

**Analog:** `src/features/demos/components/tokens-table.tsx` (raw shadcn `<Table>`; CONTEXT.md `Discretion` says NO nuqs / no `useDataTable` for v1).

**Imports + structure** (from `tokens-table.tsx` lines 6–13, 52–104):
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

return (
  <div className='rounded-md border'>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Level</TableHead>
          <TableHead className='text-right tabular-nums'>Submissions</TableHead>
          <TableHead>Latest activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {learners.map((l) => (
          <TableRow key={l.id} className='cursor-pointer hover:bg-brand-cream'>
            <TableCell className='font-medium'>
              <Link href={`/dashboard/teach/cohorts/${cohortId}/learners/${l.id}`}>
                {l.name}
              </Link>
            </TableCell>
            <TableCell>{l.level ?? '—'}</TableCell>
            <TableCell className='text-right tabular-nums'>{l.submissionCount}</TableCell>
            <TableCell>{formatLatest(l.latestActivityAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
```

**Empty-state copy** (UI-SPEC): `No learners in this cohort yet.`

**Date formatting** (UI-SPEC §Date / relative-time):
- `formatDistanceToNowStrict` from `date-fns` for ≤7 days, `format(date, 'MMM d')` for ≤30 days, `format(date, 'MMM d, yyyy')` for >30 days. Project depends on `date-fns 4.1.0` (CLAUDE.md).

**LOCKED:**
- Default sort `name ASC`, no functional sort (CONTEXT.md Discretion).
- Row link target = `/dashboard/teach/cohorts/{cohortId}/learners/{learnerId}` per UI-SPEC (URL only — Phase 3 wires the page).
- `cursor-pointer` + `brand-cream` hover row affordance (UI-SPEC).

---

### `src/features/teach/components/progress-matrix.tsx` — component (sticky-header grid)

**Analogs:**
- `src/components/ui/table.tsx` (raw `<Table>` primitive)
- `src/components/ui/table/data-table.tsx` lines 27–46 (sticky-header pattern inside `ScrollArea`)
- `src/components/ui/tooltip.tsx` (per-cell hover)

**Sticky-header inside ScrollArea pattern** (from `data-table.tsx` lines 26–47):
```typescript
<ScrollArea className='h-full w-full'>
  <Table>
    <TableHeader className='bg-muted sticky top-0 z-10'>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead key={header.id} colSpan={header.colSpan} style={{ /* pinning */ }}>
              {/* render */}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
    <TableBody>
      {/* rows */}
    </TableBody>
  </Table>
  <ScrollBar orientation='horizontal' />
</ScrollArea>
```
> Apply the same `sticky top-0 z-10` to header row; apply `sticky left-0` + `bg-card` to first cell of each row to keep learner-name column visible during horizontal scroll. Min-width 200px on learner-name column (UI-SPEC §Spacing).

**MODULES iteration** (from `src/features/teach/constants/modules.ts`):
```typescript
import { MODULES } from '@/features/teach/constants/modules';
// already exported in num order — iterate as-is

<TableHeader>
  <TableRow>
    <TableHead className='sticky left-0 z-20 bg-card'>Learner</TableHead>
    {MODULES.map((m) => (
      <TableHead key={m.id} className='text-center'>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='text-xs uppercase font-semibold tabular-nums'>
              M{String(m.num).padStart(2, '0')}
            </span>
          </TooltipTrigger>
          <TooltipContent>{m.title}</TooltipContent>
        </Tooltip>
      </TableHead>
    ))}
  </TableRow>
</TableHeader>
```

**Cell encoding** (UI-SPEC §Color §Cell encoding spec — D-16 LOCKED):
```typescript
const dotClass: Record<ProgressState, string> = {
  'not-started': 'h-3 w-3 rounded-full border border-brand-cream bg-transparent',
  'submitted':   'h-3 w-3 rounded-full border-[1.5px] border-brand-sage bg-transparent',
  'reviewed':    'h-3 w-3 rounded-full bg-brand-sage border-0'
};

<TableCell className='h-8 w-8 text-center'>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className={dotClass[cell.state]} aria-label={tooltipFor(cell)} />
    </TooltipTrigger>
    <TooltipContent>{tooltipFor(cell)}</TooltipContent>
  </Tooltip>
</TableCell>
```

**Tooltip copy** (D-18 LOCKED, dates via `format(date, 'MMM d, yyyy')`):
- `not-started` → `Not started`
- `submitted` → `Submitted ${format(submittedAt, 'MMM d, yyyy')} · Awaiting review`
- `reviewed` → `Submitted ${format(submittedAt, 'MMM d, yyyy')} · Reviewed ${format(reviewedAt, 'MMM d, yyyy')}`

**LOCKED:**
- One cell per module (D-19) — 12 columns, NOT one per `(module, type)`.
- Cells are NOT links (D-17) — no navigation in Phase 2.
- No amber, no rose — sage-only encoding (D-16).
- aria-label on each cell for screen readers (UI-SPEC).

**Optional legend** (UI-SPEC, executor discretion): three swatches below table — `Not started · Submitted · Reviewed`.

---

### `tests/e2e/teach-cohorts.spec.ts` — Playwright e2e

**Analog:** `tests/e2e/teach-nav.spec.ts` (same dashboard surface, same auth helper pattern).

**Auth helper pattern** (lines 14–37 of `teach-nav.spec.ts`) — copy verbatim:
```typescript
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = process.env['TEST_ADMIN_EMAIL'] ?? '';
const PASSWORD = process.env['TEST_ADMIN_PASSWORD'] ?? '';
const MANUAL_AUTH_TIMEOUT_MS = 120_000;

async function signInAsAdmin(page: Page) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle' });
  if (EMAIL && PASSWORD) {
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  } else {
    // ... manual fallback ...
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
      timeout: MANUAL_AUTH_TIMEOUT_MS
    });
  }
}
```

**Happy-path test pattern** (CONTEXT.md Discretion): two checks
1. `/dashboard/teach/cohorts` loads, shows `spring-2026` card with real counts (≥1 learner, observable in card text).
2. `/dashboard/teach/cohorts/spring-2026` loads, both tabs render, matrix has ≥1 sage cell (`bg-brand-sage` class on at least one element).

**Test scaffold** (mirroring `teach-nav.spec.ts` lines 39–96):
```typescript
test.describe('Cohorts hub happy path', () => {
  test('cohorts list shows at least one cohort card with counts', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Cohorts' })).toBeVisible();
    // Spring 2026 card present
    const card = page.getByRole('link', { name: /Open Spring 2026/i });
    await expect(card).toBeVisible({ timeout: 8_000 });
  });

  test('cohort detail renders both tabs and a matrix cell', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts/spring-2026`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('tab', { name: 'Learners' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Progress matrix' })).toBeVisible();
    await page.getByRole('tab', { name: 'Progress matrix' }).click();
    // At least one sage-filled (reviewed) cell expected
    const sageCells = page.locator('.bg-brand-sage');
    await expect(sageCells.first()).toBeVisible({ timeout: 8_000 });
  });
});
```

---

## Shared Patterns

### Server-only marker
**Source:** `src/features/teach/api/service.ts` line 1 + `src/lib/supabase/admin.ts` line 1
**Apply to:** `src/features/teach/api/service.ts` (already present — DO NOT remove)
```typescript
import 'server-only';
```

### Admin Supabase client (singleton)
**Source:** `src/lib/supabase/admin.ts` lines 27–57
**Apply to:** `src/features/teach/api/service.ts` (only)
```typescript
import { createAdminClient } from '@/lib/supabase/admin';
const client = createAdminClient();
const { data, error } = await client.from('learners').select(...);
if (error) throw new Error(`getCohorts: ${error.message}`);
```
> Service-role key MUST stay confined to `src/lib/supabase/admin.ts`. Never `import { createClient } from '@supabase/supabase-js'` directly inside `service.ts`.

### RBAC defense-in-depth (RSC pages)
**Source:** existing `src/app/dashboard/teach/cohorts/page.tsx` lines 1–11 + `src/lib/auth/require-admin.ts`
**Apply to:** Both Phase 2 route files (`cohorts/page.tsx`, `cohorts/[cohort]/page.tsx`)
```typescript
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function CohortsPage() {
  await requireAdmin(); // throws NEXT_REDIRECT if not admin
  // ...
}
```
> Layout already gates (`src/app/dashboard/teach/layout.tsx`); page-level guard is belt-and-suspenders per existing convention.

### RSC prefetch + HydrationBoundary
**Source:** `src/features/demos/components/demos-listing.tsx` lines 1–25 (canonical)
**Apply to:** Both Phase 2 route files
```typescript
import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';

const queryClient = getQueryClient();
void queryClient.prefetchQuery(/* options */);

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <Suspense fallback={<Skeleton />}>
      <ClientChild />
    </Suspense>
  </HydrationBoundary>
);
```

### `useSuspenseQuery` consumption
**Source:** `src/features/demos/components/tokens-table.tsx` line 28
**Apply to:** `cohorts-listing.tsx`, `cohort-detail.tsx`
```typescript
'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
const { data } = useSuspenseQuery(cohortsQueryOptions());
```

### Page header via `PageContainer`
**Source:** `src/components/layout/page-container.tsx` lines 21–69 + CLAUDE.md "Page headers — use PageContainer props (...) never import `<Heading>` manually"
**Apply to:** Both Phase 2 route files (D-14)
```typescript
<PageContainer
  pageTitle={...}
  pageDescription={...}
  pageHeaderAction={...}
>
  {children}
</PageContainer>
```

### Disabled placeholder buttons (D-11, D-12)
**Source:** UI-SPEC §Disabled-button accessibility
**Apply to:** "+ New cohort", "Export" CTAs on both pages
```tsx
<Button
  variant='default' /* or 'outline' for Export */
  disabled
  aria-disabled='true'
  title='Coming soon'
>
  + New cohort
</Button>
```

### Icons (CLAUDE.md mandate)
**Source:** `src/components/icons.tsx` (registry)
**Apply to:** All new components
```typescript
import { Icons } from '@/components/icons';
<Icons.school className='h-8 w-8' />     // empty state
<Icons.chevronRight className='h-3 w-3' /> // card open affordance
<Icons.upload className='h-3 w-3' />      // export placeholder
<Icons.alertCircle className='h-4 w-4' /> // error boundary
```
> NEVER `import { IconChevronRight } from '@tabler/icons-react'` directly. Verified `Icons.school`, `Icons.chevronRight`, `Icons.upload`, `Icons.alertCircle`, `Icons.plus` all exist in `src/components/icons.tsx`.

### Brand color usage (CLAUDE.md)
**Source:** `CLAUDE.md` Color Scheme + UI-SPEC §Color
**Apply to:** All components
- Page bg: inherited `brand-beige` from dashboard layout
- Cards: `bg-card` (white) — shadcn default
- Primary ink: `text-brand-teal` (headings, page title)
- Accent: `bg-brand-sage` ONLY for (1) reviewed matrix dot fill, (2) submitted matrix outline ring, (3) Active status pill dot. Nothing else.
- Borders / muted: `border-brand-cream` / `text-muted-foreground`

### Error boundary (Next App Router `error.tsx`)
**Source:** `src/app/dashboard/overview/error.tsx`
**Apply to:** Each Phase 2 route segment (`cohorts/error.tsx`, `cohorts/[cohort]/error.tsx`)
```typescript
'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';

export default function CohortsError({ error }: { error: Error }) {
  return (
    <Alert variant='destructive'>
      <Icons.alertCircle className='h-4 w-4' />
      <AlertTitle>Could not load cohorts</AlertTitle>
      <AlertDescription>
        Refresh the page to try again. If the problem persists, contact support.
      </AlertDescription>
    </Alert>
  );
}
```

### Tooltip (per-cell hover)
**Source:** `src/components/ui/tooltip.tsx` lines 1–57
**Apply to:** `progress-matrix.tsx` (every cell + every module-header)
```typescript
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger asChild>
    <span className={dotClass[cell.state]} aria-label={tooltipText} />
  </TooltipTrigger>
  <TooltipContent>{tooltipText}</TooltipContent>
</Tooltip>
```

### Code-style conventions (CLAUDE.md)
**Apply to:** All new/modified files
- Single quotes, JSX single quotes, no trailing comma, 2-space indent.
- Path alias `@/` only — never `../../../`.
- Named exports preferred (except Next route `default export` requirement).
- TypeScript strict; `unknown` over `any`; explicit return types on exported functions.
- No `console.log`; `console.warn`/`console.error` allowed only.

---

## No Analog Found

**None.** Every Phase 2 file has at least a role-match analog already in the repo. Pattern coverage is complete.

---

## Metadata

**Analog search scope:**
- `src/features/{teach,demos,users}/`
- `src/components/ui/{card,tabs,table,tooltip,badge,button,skeleton}.tsx`
- `src/components/ui/table/data-table.tsx`
- `src/components/layout/page-container.tsx`
- `src/lib/{supabase/admin,supabase/server,auth/require-admin,query-client}.ts`
- `src/components/icons.tsx`
- `src/app/dashboard/{teach,overview}/`
- `tests/e2e/teach-nav.spec.ts`, `tests/e2e/demos.spec.ts`
- `teacher-admin/teacher-admin.jsx` (prototype IA reference)

**Files scanned:** ~25
**Pattern extraction date:** 2026-04-25
