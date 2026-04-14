// GET /api/demos/spend — return today's estimated demo spend.
//
// IMPORTANT: this is an internal estimate from per-call cents constants,
// NOT vendor-billed totals. The UI labels it as such. Tune the per-call
// constants in terenure-proyect/frontend/src/app/api/{elevenlabs-token,gemini}
// to keep the estimate honest.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { get } from '@/lib/redis';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const cap = Number(process.env.DEMO_DAILY_BUDGET_CENTS ?? '0');

  try {
    const raw = await get(`demo:spend:${date}`);
    const spent = raw ? Number(raw) : 0;
    return NextResponse.json({
      date,
      spentCents: Number.isFinite(spent) ? spent : 0,
      capCents: cap
    });
  } catch (err) {
    console.error('spend read failed:', err);
    return NextResponse.json({ error: 'redis unavailable' }, { status: 503 });
  }
}
