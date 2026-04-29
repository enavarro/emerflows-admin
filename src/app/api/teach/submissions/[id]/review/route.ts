// POST /api/teach/submissions/[id]/review — toggle reviewed_at / reviewed_by.
// Uses the user-session Supabase client (D-04a) so auth.uid() is the
// reviewed_by value and the column-level GRANT (Phase 1 migration) gates the
// allowed columns. RLS USING(is_admin()) blocks non-admin writes.
//
// Defense-in-depth: requireAdmin() also runs at the top of the handler so a
// non-admin session is redirected before any DB call.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { MarkReviewedResponse } from '@/features/teach/api/types';

const reviewInputSchema = z.object({ reviewed: z.boolean() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defense-in-depth admin gate (layout already gates dashboard, but this
  // handler is reachable from anywhere a session cookie is present).
  await requireAdmin();

  const { id: submissionId } = await params;
  if (!submissionId || !/^[a-f0-9-]{36}$/i.test(submissionId)) {
    return NextResponse.json({ error: 'invalid submission id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // D-04a: USER-SESSION client (NOT admin client). auth.uid() flows naturally
  // as reviewed_by; RLS + Phase-1 column-level grant enforce admin-only +
  // (reviewed_at, reviewed_by) column whitelist.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const update = parsed.data.reviewed
    ? { reviewed_at: now, reviewed_by: user.id }
    : { reviewed_at: null, reviewed_by: null };

  try {
    const { data, error } = await supabase
      .from('submissions')
      .update(update)
      .eq('id', submissionId)
      .select('id, reviewed_at, reviewed_by')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'update failed' },
        { status: 500 }
      );
    }

    const response: MarkReviewedResponse = {
      submission: {
        id: data.id as string,
        reviewedAt: data.reviewed_at as string | null,
        reviewedBy: data.reviewed_by as string | null
      }
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error('mark reviewed failed:', err);
    return NextResponse.json({ error: 'mark reviewed failed' }, { status: 500 });
  }
}
