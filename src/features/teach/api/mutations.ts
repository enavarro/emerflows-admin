import { mutationOptions } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';
import { markReviewed } from './service-client';
import { teachKeys } from './queries';
import type { MarkReviewedInput, MarkReviewedResponse } from './types';

export const markReviewedMutation = mutationOptions<
  MarkReviewedResponse,
  Error,
  MarkReviewedInput
>({
  mutationFn: (input: MarkReviewedInput) => markReviewed(input),
  onSuccess: () => {
    // REV-02: invalidate the entire teach key tree so cohort matrix +
    // learner page + viewer all refresh on next view.
    getQueryClient().invalidateQueries({ queryKey: teachKeys.all });
  }
});
