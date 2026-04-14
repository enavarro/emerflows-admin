import * as z from 'zod';

export const mintInputSchema = z.object({
  label: z.string().min(1, 'Label is required').max(120, 'Label must be 120 characters or fewer')
});

export type MintInputValues = z.infer<typeof mintInputSchema>;
