import 'server-only';

// ============================================================
// Teach Admin — data access (FND-03)
// ============================================================
// These functions own the read-side contracts the feature exposes.
// Phase 2 (Cohorts Hub) implements getCohorts + getCohort.
// Phase 3 (Learner Deep-Dive) implements getLearner + getSubmission.
// Each Phase-3 stub throws so accidental usage in early phases fails
// loudly rather than rendering empty pages.
// ============================================================

import type {
  Cohort,
  CohortDetail,
  LearnerDetail,
  LearnerRow,
  ModuleProgressCell,
  ModuleType,
  RecordingPayload,
  SubmissionDetail,
  SubmissionPayload,
  SubmissionSummary
} from './types';
import { MODULES, getModule } from '@/features/teach/constants/modules';
import { createAdminClient, createSignedRecordingUrl } from '@/lib/supabase/admin';

export async function getCohorts(): Promise<Cohort[]> {
  const client = createAdminClient();

  // Trip 1: distinct cohorts + every learner's id (to bound trip 2). D-01.
  const { data: learnerRows, error: learnersError } = await client
    .from('learners')
    .select('id, cohort')
    .not('cohort', 'is', null);

  if (learnersError) {
    throw new Error(`getCohorts: failed to load learners: ${learnersError.message}`);
  }
  if (!learnerRows || learnerRows.length === 0) {
    return [];
  }

  // Build cohort -> learnerIds[] map.
  const learnersByCohort = new Map<string, string[]>();
  for (const row of learnerRows) {
    const cohortId = row.cohort as string;
    const arr = learnersByCohort.get(cohortId) ?? [];
    arr.push(row.id as string);
    learnersByCohort.set(cohortId, arr);
  }

  const allLearnerIds = learnerRows.map((r) => r.id as string);

  // Trip 2: bulk submissions for all learners in scope. D-01.
  const { data: subRows, error: subsError } = await client
    .from('submissions')
    .select('learner_id, module_id, type, reviewed_at')
    .in('learner_id', allLearnerIds);

  if (subsError) {
    throw new Error(`getCohorts: failed to load submissions: ${subsError.message}`);
  }

  // Index learner_id -> cohort_id (reverse lookup).
  const cohortByLearnerId = new Map<string, string>();
  for (const row of learnerRows) {
    cohortByLearnerId.set(row.id as string, row.cohort as string);
  }

  // Aggregate counts per cohort. totalSubmissions de-duplicates on
  // (learner_id, module_id, type) per D-02. needsReview/reviewed split
  // on `reviewed_at IS NULL` per D-03/D-04 — no status filter.
  const distinctKeysByCohort = new Map<string, Set<string>>();
  const needsReviewByCohort = new Map<string, number>();
  const reviewedByCohort = new Map<string, number>();

  for (const sub of subRows ?? []) {
    const cohortId = cohortByLearnerId.get(sub.learner_id as string);
    if (!cohortId) continue; // learner outside scope — skip (defense-in-depth)

    const dedupeKey = `${sub.learner_id}|${sub.module_id}|${sub.type}`;
    const distinctSet = distinctKeysByCohort.get(cohortId) ?? new Set<string>();
    distinctSet.add(dedupeKey);
    distinctKeysByCohort.set(cohortId, distinctSet);

    if (sub.reviewed_at === null) {
      needsReviewByCohort.set(cohortId, (needsReviewByCohort.get(cohortId) ?? 0) + 1);
    } else {
      reviewedByCohort.set(cohortId, (reviewedByCohort.get(cohortId) ?? 0) + 1);
    }
  }

  // Compose Cohort[] in stable order (alphabetical by id).
  const cohortIds = Array.from(learnersByCohort.keys()).toSorted();
  return cohortIds.map((id) => ({
    id,
    name: humanizeCohortId(id),
    termHint: humanizeCohortId(id), // D-08 placeholder until a real term column exists
    learnerCount: learnersByCohort.get(id)?.length ?? 0,
    totalSubmissions: distinctKeysByCohort.get(id)?.size ?? 0,
    needsReview: needsReviewByCohort.get(id) ?? 0,
    reviewed: reviewedByCohort.get(id) ?? 0
  }));
}

// Local helper — 'spring-2026' -> 'Spring 2026'. Pure, no I/O.
function humanizeCohortId(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Local helper — parse an ISO 8601 timestamp into epoch ms, returning -1
// for null/undefined/invalid strings so it sorts strictly before any real
// timestamp. Used to compare submitted_at/reviewed_at robustly across
// possible zone-format variations (see WR-03 note in getCohort).
function tsMs(iso: string | null | undefined): number {
  if (!iso) return -1;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? -1 : t;
}

export async function getCohort(cohortId: string): Promise<CohortDetail> {
  const client = createAdminClient();

  // 1. Load the cohort's learners (sorted by name; default UI order).
  //
  // Schema note: `learners` exposes id, name, cohort, external_id,
  // created_at, is_demo, demo_session_jti — there is no `level` column.
  // The LearnerRow contract carries an optional `level` for forward
  // compatibility (a future migration may add a level column or join);
  // for now we leave it undefined and the UI renders the '—' fallback
  // (see learners-table.tsx — `learner.level ?? '—'`).
  const { data: learnerRows, error: learnersError } = await client
    .from('learners')
    .select('id, name, cohort, external_id')
    .eq('cohort', cohortId)
    .order('name', { ascending: true });

  if (learnersError) {
    throw new Error(`getCohort(${cohortId}): failed to load learners: ${learnersError.message}`);
  }

  const learners = learnerRows ?? [];
  const learnerIds = learners.map((l) => l.id as string);

  // 2. Load submissions for those learners. Empty learner set → skip the
  //    second trip and return a zero-learner CohortDetail.
  //
  // Schema note: `submissions` exposes created_at (the canonical "when
  // the learner submitted" timestamp), reviewed_at, attempt_num, etc.
  // There is no `submitted_at` column. We alias created_at → submitted_at
  // in TS so downstream logic + wire-format names stay aligned with
  // CohortDetail / SubmissionSummary contracts (LearnerRow.latestActivityAt
  // and ModuleProgressCell.submittedAt are documented as
  // "when the submission was created").
  type SubmissionAggRow = {
    id: string;
    learner_id: string;
    module_id: string;
    type: ModuleType;
    submitted_at: string;
    reviewed_at: string | null;
  };

  let subRows: SubmissionAggRow[] = [];

  if (learnerIds.length > 0) {
    const { data, error: subsError } = await client
      .from('submissions')
      .select('id, learner_id, module_id, type, created_at, reviewed_at')
      .in('learner_id', learnerIds);

    if (subsError) {
      throw new Error(`getCohort(${cohortId}): failed to load submissions: ${subsError.message}`);
    }
    subRows = ((data ?? []) as Array<{
      id: string;
      learner_id: string;
      module_id: string;
      type: ModuleType;
      created_at: string;
      reviewed_at: string | null;
    }>).map((r) => ({
      id: r.id,
      learner_id: r.learner_id,
      module_id: r.module_id,
      type: r.type,
      // Alias DB column created_at to the wire-format submitted_at name.
      submitted_at: r.created_at,
      reviewed_at: r.reviewed_at
    }));
  }

  // 3. Build cohort summary counts (mirror D-02..D-04 from getCohorts but
  //    scoped to this cohort).
  const distinctSubmissionKeys = new Set<string>();
  let needsReview = 0;
  let reviewed = 0;
  for (const sub of subRows) {
    distinctSubmissionKeys.add(`${sub.learner_id}|${sub.module_id}|${sub.type}`);
    if (sub.reviewed_at === null) {
      needsReview += 1;
    } else {
      reviewed += 1;
    }
  }

  const cohort: Cohort = {
    id: cohortId,
    name: humanizeCohortId(cohortId),
    termHint: humanizeCohortId(cohortId),
    learnerCount: learners.length,
    totalSubmissions: distinctSubmissionKeys.size,
    needsReview,
    reviewed
  };

  // 4. Build LearnerRow[] (per-learner submissionCount uses distinct
  //    (module_id, type), matching D-02 semantics scoped to a single
  //    learner; latestActivityAt = max(submitted_at, reviewed_at) so
  //    a review action also bumps the activity timestamp).
  const subsByLearner = new Map<string, SubmissionAggRow[]>();
  for (const sub of subRows) {
    const arr = subsByLearner.get(sub.learner_id) ?? [];
    arr.push(sub);
    subsByLearner.set(sub.learner_id, arr);
  }

  // WR-03: compare timestamps as numeric epoch-ms via Date.parse() rather
  // than lexicographic string compare. ISO 8601 strings only sort
  // correctly lexicographically when every value uses the same zone
  // format (e.g. PostgREST's `+00:00` suffix). If a future migration ever
  // emits `Z`-suffixed or local-zoned timestamps, lexicographic order
  // would silently mis-order rows. Parsing once per comparison is cheap
  // and removes the foot-gun.
  const learnerRowList: LearnerRow[] = learners.map((l) => {
    const learnerSubs = subsByLearner.get(l.id as string) ?? [];
    const distinctPerLearner = new Set<string>();
    let latestTs: string | null = null;
    let latestMs = -1;
    for (const s of learnerSubs) {
      distinctPerLearner.add(`${s.module_id}|${s.type}`);
      const submittedMs = tsMs(s.submitted_at);
      const reviewedMs = tsMs(s.reviewed_at);
      const candidateMs = Math.max(submittedMs, reviewedMs);
      const candidate =
        s.reviewed_at && reviewedMs > submittedMs ? s.reviewed_at : s.submitted_at;
      if (candidateMs > latestMs) {
        latestMs = candidateMs;
        latestTs = candidate;
      }
    }
    return {
      id: l.id as string,
      name: l.name as string,
      cohort: l.cohort as string,
      // No level column on learners yet (see schema note above). Leave
      // undefined so the UI renders the '—' fallback contract intact.
      level: undefined,
      externalId: (l.external_id as string | null) ?? undefined,
      submissionCount: distinctPerLearner.size,
      latestActivityAt: latestTs
    };
  });

  // 5. Build matrix per D-05 (LATEST submission per (learner, module) wins).
  //    Latest = max(submitted_at). Resolves ties deterministically by id desc.
  //    Numeric epoch-ms comparison via tsMs() — see WR-03 note above.
  const latestByLearnerModule = new Map<string, SubmissionAggRow>();
  for (const sub of subRows) {
    const key = `${sub.learner_id}|${sub.module_id}`;
    const existing = latestByLearnerModule.get(key);
    const newMs = tsMs(sub.submitted_at);
    const oldMs = existing ? tsMs(existing.submitted_at) : -1;
    if (
      !existing ||
      newMs > oldMs ||
      (newMs === oldMs && sub.id > existing.id)
    ) {
      latestByLearnerModule.set(key, sub);
    }
  }

  const matrix: Record<string, ModuleProgressCell[]> = {};
  for (const learner of learnerRowList) {
    const cells: ModuleProgressCell[] = MODULES.map((mod) => {
      const latest = latestByLearnerModule.get(`${learner.id}|${mod.id}`);
      if (!latest) {
        return {
          moduleId: mod.id,
          state: 'not-started',
          submissionId: null,
          submittedAt: null,
          reviewedAt: null
        };
      }
      return {
        moduleId: mod.id,
        state: latest.reviewed_at === null ? 'submitted' : 'reviewed',
        submissionId: latest.id,
        submittedAt: latest.submitted_at,
        reviewedAt: latest.reviewed_at
      };
    });
    matrix[learner.id] = cells;
  }

  return { cohort, learners: learnerRowList, matrix };
}

export async function getLearner(learnerId: string): Promise<LearnerDetail> {
  const client = createAdminClient();

  // Trip 1: load the learner row.
  //
  // Schema note: `learners` exposes id, name, cohort, external_id — there
  // is no `level` column today, so we leave LearnerRow.level undefined and
  // the UI renders the '—' fallback (D-09). Map external_id → externalId.
  const { data: learnerRow, error: learnerError } = await client
    .from('learners')
    .select('id, name, cohort, external_id')
    .eq('id', learnerId)
    .maybeSingle();

  if (learnerError) {
    throw new Error(
      `getLearner(${learnerId}): failed to load learner: ${learnerError.message}`
    );
  }
  if (!learnerRow) {
    throw new Error(`getLearner(${learnerId}): learner not found`);
  }

  // Trip 2: load submissions for this learner.
  //
  // Schema note: `submissions` has no `submitted_at` column — alias DB
  // created_at to wire-format submittedAt. attempt_num → attemptNum.
  const { data: subRows, error: subsError } = await client
    .from('submissions')
    .select(
      'id, learner_id, module_id, type, attempt_num, status, created_at, reviewed_at, reviewed_by'
    )
    .eq('learner_id', learnerId);

  if (subsError) {
    throw new Error(
      `getLearner(${learnerId}): failed to load submissions: ${subsError.message}`
    );
  }

  const rows = subRows ?? [];

  // Aggregate submissionCount (distinct on module_id|type per D-02 scoped
  // to a single learner) + latestActivityAt (max of submitted/reviewed).
  // tsMs() handles ISO timestamp parsing safely (see WR-03 in getCohort).
  const distinctPerLearner = new Set<string>();
  let latestTs: string | null = null;
  let latestMs = -1;
  for (const s of rows) {
    distinctPerLearner.add(`${s.module_id}|${s.type}`);
    const submittedMs = tsMs(s.created_at as string);
    const reviewedMs = tsMs(s.reviewed_at as string | null);
    const candidateMs = Math.max(submittedMs, reviewedMs);
    const candidate =
      s.reviewed_at && reviewedMs > submittedMs
        ? (s.reviewed_at as string)
        : (s.created_at as string);
    if (candidateMs > latestMs) {
      latestMs = candidateMs;
      latestTs = candidate;
    }
  }

  const learner: LearnerRow = {
    id: learnerRow.id as string,
    name: learnerRow.name as string,
    cohort: learnerRow.cohort as string,
    level: undefined,
    externalId: (learnerRow.external_id as string | null) ?? undefined,
    submissionCount: distinctPerLearner.size,
    latestActivityAt: latestTs
  };

  // Group submissions by module_id (LRN-02). Wire-format aliasing:
  // created_at → submittedAt, learner_id → learnerId, module_id → moduleId,
  // attempt_num → attemptNum, reviewed_by → reviewedBy. Sort order is a
  // UI-side concern (D-05) — we return rows unsorted on the wire.
  const submissionsByModule: Record<string, SubmissionSummary[]> = {};
  for (const r of rows) {
    const summary: SubmissionSummary = {
      id: r.id as string,
      learnerId: r.learner_id as string,
      moduleId: r.module_id as string,
      type: r.type as ModuleType,
      attemptNum: (r.attempt_num as number) as 1 | 2,
      status: r.status as string,
      submittedAt: r.created_at as string,
      reviewedAt: (r.reviewed_at as string | null) ?? null,
      reviewedBy: (r.reviewed_by as string | null) ?? null
    };
    const arr = submissionsByModule[summary.moduleId] ?? [];
    arr.push(summary);
    submissionsByModule[summary.moduleId] = arr;
  }

  return { learner, submissionsByModule };
}

export async function getSubmission(submissionId: string): Promise<SubmissionDetail> {
  // TODO(Phase3 / SPK-*, CNV-*): fetch submission + payload + sign audio URL via createSignedRecordingUrl
  throw new Error(
    `getSubmission(${submissionId}) is not implemented — see Phase 3 plan (SPK-*, CNV-*)`
  );
}
