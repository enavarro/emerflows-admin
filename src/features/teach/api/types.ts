// ============================================================
// Teach Admin — public type contracts (FND-03)
// ============================================================
// Implementation (service.ts) and consumers (Phase 2/3 components)
// import only from this file. Wire-format types live here so the
// service implementation can be swapped without touching downstream code.
// ============================================================

export type ModuleType = 'conversation' | 'recording';

export interface ModuleDef {
  id: string;
  num: number;
  title: string;
  types: ModuleType[];
}

export interface Cohort {
  id: string;
  name: string;
  termHint?: string;
  learnerCount: number;
  totalSubmissions: number;
  needsReview: number;
  reviewed: number;
}

export type ProgressState = 'not-started' | 'submitted' | 'reviewed';

export interface ModuleProgressCell {
  moduleId: string;
  state: ProgressState;
  submissionId: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface LearnerRow {
  id: string;
  name: string;
  cohort: string;
  level?: string;
  externalId?: string;
  submissionCount: number;
  latestActivityAt: string | null;
}

export interface CohortDetail {
  cohort: Cohort;
  learners: LearnerRow[];
  // Keyed by learnerId; each value is module-progress cells sorted by ModuleDef.num.
  matrix: Record<string, ModuleProgressCell[]>;
}

export interface SubmissionSummary {
  id: string;
  learnerId: string;
  moduleId: string;
  type: ModuleType;
  attemptNum: 1 | 2;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface LearnerDetail {
  learner: LearnerRow;
  // Keyed by moduleId; each value is the learner's submissions for that module
  // (typically 0..2 entries — one per attempt — and possibly one per type).
  submissionsByModule: Record<string, SubmissionSummary[]>;
}

// ----- Recording (speaking) payload shapes ---------------------------------

export interface RecordingTranscriptWord {
  word: string;
  pronunciation: string;
}

export interface RecordingTranscriptEntry {
  text: string;
  classification: 'strong' | 'needs improvement';
  words: RecordingTranscriptWord[];
}

export interface RecordingTip {
  category: 'pronunciation' | 'delivery';
  tip: string;
}

export interface RecordingPayload {
  tips: RecordingTip[];
  level: string;
  audioPath: string;
  recordingTranscript: RecordingTranscriptEntry[];
}

// ----- Conversation payload shapes -----------------------------------------

export interface ConversationFlag {
  word: string;
  issue: string;
  suggestion: string;
}

export interface ClassifiedPair {
  question: string;
  answer: string;
  flags: ConversationFlag[];
}

export interface ConversationPayload {
  introduction: string;
  conversationId: string;
  classifiedPairs: ClassifiedPair[];
  exerciseSummary: string;
}

// Discriminated union — narrow on `submission.type` at the call site.
export type SubmissionPayload = RecordingPayload | ConversationPayload;

export interface SubmissionDetail {
  submission: SubmissionSummary;
  learner: LearnerRow;
  module: ModuleDef;
  payload: SubmissionPayload;
  // Present only when submission.type === 'recording' and audioPath resolves.
  signedAudioUrl?: { url: string; expiresAt: string };
}

// ----- Mark-as-reviewed mutation contract (REV-01..REV-03) -----------------

export interface MarkReviewedInput {
  submissionId: string;
  reviewed: boolean; // false = undo (REV-03)
}

export interface MarkReviewedResponse {
  submission: Pick<SubmissionSummary, 'id' | 'reviewedAt' | 'reviewedBy'>;
}
