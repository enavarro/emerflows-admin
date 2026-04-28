// /api/demos
//   GET  → list active demo tokens (filters out expired entries from the index)
//   POST → mint a new token, persist metadata in Redis, return the share URL
//
// Auth: requires an authenticated Supabase session. Dashboard is already
// gated, this is defense in depth so the handler can't be hit directly.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { signDemoJwt } from '@/lib/demo-jwt';
import { get, setex, sadd, smembers, srem, sismember } from '@/lib/redis';
import { mintInputSchema } from '@/features/demos/schemas/mint-input';
import type { DemoToken } from '@/features/demos/api/types';

const TOKEN_TTL_SEC = 30 * 24 * 60 * 60;
const HARDCODED_MAX_SUBMISSIONS = 2;
const HARDCODED_MAX_CONVERSATION_SEC = 210;
const ACTIVE_INDEX = 'demo:tokens:active';
const REVOKED_SET = 'demo:revoked';

interface StoredToken {
  jti: string;
  label: string;
  url: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
}

function tokenKey(jti: string): string {
  return `demo:token:${jti}`;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const jtis = await smembers(ACTIVE_INDEX);
    const tokens: DemoToken[] = [];
    const stale: string[] = [];

    for (const jti of jtis) {
      const raw = await get(tokenKey(jti));
      if (!raw) {
        stale.push(jti);
        continue;
      }
      const stored = JSON.parse(raw) as StoredToken;
      const revoked = await sismember(REVOKED_SET, jti);
      tokens.push({ ...stored, revoked });
    }

    // Best-effort cleanup of expired index entries; don't block the response.
    await Promise.all(stale.map((jti) => srem(ACTIVE_INDEX, jti))).catch(() => {});

    tokens.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return NextResponse.json({ tokens });
  } catch (err) {
    console.error('list tokens failed:', err);
    return NextResponse.json({ error: 'redis unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = mintInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const baseUrl = process.env.DEMO_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'DEMO_BASE_URL not configured' }, { status: 500 });
  }

  try {
    const jti = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_SEC * 1000);

    const jwt = await signDemoJwt(
      {
        jti,
        source: 'admin_link',
        generatedBy: user.email ?? user.id,
        maxSubmissions: HARDCODED_MAX_SUBMISSIONS,
        maxConversationSec: HARDCODED_MAX_CONVERSATION_SEC,
        label: parsed.data.label
      },
      TOKEN_TTL_SEC
    );

    const url = `${baseUrl.replace(/\/$/, '')}/?t=${jwt}`;

    const stored: StoredToken = {
      jti,
      label: parsed.data.label,
      url,
      createdAt: now.toISOString(),
      createdBy: user.email ?? user.id,
      expiresAt: expiresAt.toISOString()
    };

    await setex(tokenKey(jti), TOKEN_TTL_SEC, JSON.stringify(stored));
    await sadd(ACTIVE_INDEX, jti);

    return NextResponse.json({ token: { ...stored, revoked: false } });
  } catch (err) {
    console.error('mint token failed:', err);
    return NextResponse.json({ error: 'mint failed' }, { status: 500 });
  }
}
