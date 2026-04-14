// DELETE /api/demos/:jti — revoke a demo token.
// Adds jti to demo:revoked SET (the terenure middleware checks this on every
// request). Also drops the token from the active index so the list cleans up.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sadd, srem, del } from '@/lib/redis';

const ACTIVE_INDEX = 'demo:tokens:active';
const REVOKED_SET = 'demo:revoked';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jti: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { jti } = await params;
  if (!jti || !/^[a-f0-9-]{36}$/i.test(jti)) {
    return NextResponse.json({ error: 'invalid jti' }, { status: 400 });
  }

  try {
    await sadd(REVOKED_SET, jti);
    await srem(ACTIVE_INDEX, jti);
    await del(`demo:token:${jti}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('revoke failed:', err);
    return NextResponse.json({ error: 'revoke failed' }, { status: 503 });
  }
}
