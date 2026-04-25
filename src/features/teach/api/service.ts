import 'server-only';

// ============================================================
// Teach Admin — data access stubs (FND-03)
// ============================================================
// These functions own the read-side contracts the feature exposes.
// Phase 2 (Cohorts Hub) implements getCohorts + getCohort.
// Phase 3 (Learner Deep-Dive) implements getLearner + getSubmission.
// Each stub throws so accidental usage in early phases fails loudly
// rather than rendering empty pages.
// ============================================================

import type {
  Cohort,
  CohortDetail,
  LearnerDetail,
  SubmissionDetail
} from './types';

export async function getCohorts(): Promise<Cohort[]> {
  // TODO(Phase2 / COH-01): query distinct learners.cohort + aggregate submission counts via admin client
  throw new Error('getCohorts is not implemented — see Phase 2 plan (COH-01)');
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
