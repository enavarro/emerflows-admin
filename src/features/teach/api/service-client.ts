// Client-side mutation transport. Talks to /api/teach/submissions/[id]/review
// route handler, which does the privileged work (auth check, RLS-bound UPDATE).
// Server-only reads (getLearner, getSubmission) live in service.ts and MUST
// NOT be imported from client code.
//
// Naming rationale (PATTERNS.md Pattern Note): the existing `service.ts`
// carries `import 'server-only'` and is consumed by RSC routes. This sibling
// file isolates the client-callable transport so the demos pattern is
// preserved and the server-only purity of service.ts is not breached.

import { apiClient } from '@/lib/api-client';
import type { MarkReviewedInput, MarkReviewedResponse } from './types';

export async function markReviewed(
  input: MarkReviewedInput
): Promise<MarkReviewedResponse> {
  return apiClient<MarkReviewedResponse>(
    `/teach/submissions/${encodeURIComponent(input.submissionId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ reviewed: input.reviewed })
    }
  );
}
