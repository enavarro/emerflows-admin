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
  SubmissionDetail
} from './types';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const cohortIds = Array.from(learnersByCohort.keys()).sort();
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

export async function getCohort(cohortId: string): Promise<CohortDetail> {
  // TODO(Phase2 / COD-01..04): join learners + submissions, build module progress matrix
  throw new Error(`getCohort(${cohortId}) is not implemented — see Phase 2 plan (COD-01..04)`);
}

export async function getLearner(learnerId: string): Promise<LearnerDetail> {
  // TODO(Phase3 / LRN-01..03): fetch learner + submissions grouped by module
  throw new Error(`getLearner(${learnerId}) is not implemented — see Phase 3 plan (LRN-01..03)`);
}

export async function getSubmission(submissionId: string): Promise<SubmissionDetail> {
  // TODO(Phase3 / SPK-*, CNV-*): fetch submission + payload + sign audio URL via createSignedRecordingUrl
  throw new Error(
    `getSubmission(${submissionId}) is not implemented — see Phase 3 plan (SPK-*, CNV-*)`
  );
}
