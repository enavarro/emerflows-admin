/**
 * Direct API smoke test for /api/demos and /api/demos/spend.
 *
 * Strategy:
 *   1. Sign in to Supabase via REST to get access_token + refresh_token.
 *   2. Build the sb-<project>-auth-token cookie in the format @supabase/ssr 0.10.x
 *      actually writes: "base64-" + base64url(JSON.stringify(session)).
 *   3. Hit each local API route with that cookie.
 *   4. Print status + body for each endpoint.
 *
 * Run:
 *   TEST_ADMIN_EMAIL=you@example.com TEST_ADMIN_PASSWORD=secret \
 *     node tests/e2e/demos-api-check.mjs
 */

const SUPABASE_URL = 'https://bohqhhpzsgmwsvqryhfw.supabase.co';
const ANON_KEY     = 'sb_publishable_Hqt8g6cjbxdq4xV4CX7uGg_4JYr2Hy1';
const PROJECT_REF  = 'bohqhhpzsgmwsvqryhfw';
const LOCAL_BASE   = 'http://localhost:3000';

const EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

if (!EMAIL || !PASSWORD) {
  console.error(
    'ERROR: Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD before running.\n' +
    'Example:\n' +
    '  TEST_ADMIN_EMAIL=you@example.com TEST_ADMIN_PASSWORD=secret node tests/e2e/demos-api-check.mjs'
  );
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function stringToBase64URL(str) {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// @supabase/ssr 0.10.x cookie format: "base64-" + base64url(JSON)
function buildSupabaseCookie(session) {
  const json = JSON.stringify(session);
  return 'base64-' + stringToBase64URL(json);
}

// ── 1. Authenticate ──────────────────────────────────────────────────────────
console.log(`\n[auth] signing in as ${EMAIL} …`);

const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});

const authBody = await authRes.json();

if (!authRes.ok || !authBody.access_token) {
  console.error('[auth] FAILED:', authRes.status, JSON.stringify(authBody));
  process.exit(1);
}

console.log(`[auth] OK — user: ${authBody.user?.email}`);

// ── 2. Build cookie ───────────────────────────────────────────────────────────
const session = {
  access_token:  authBody.access_token,
  refresh_token: authBody.refresh_token,
  expires_at:    authBody.expires_at,
  token_type:    authBody.token_type ?? 'bearer',
  user:          authBody.user,
};

const cookieName  = `sb-${PROJECT_REF}-auth-token`;
const cookieValue = buildSupabaseCookie(session);
const cookieHeader = `${cookieName}=${cookieValue}`;

// ── 3. Helper ─────────────────────────────────────────────────────────────────
async function callApi(method, path, body) {
  const opts = {
    method,
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json',
    },
    redirect: 'manual',
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${LOCAL_BASE}${path}`, opts);
  let   text = await res.text();
  if (text.length > 800) text = text.slice(0, 800) + ' … [truncated]';
  return { status: res.status, body: text };
}

// ── 4. Run checks ─────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  DEMOS API SMOKE TEST — LOCAL ENDPOINT RESULTS');
console.log('══════════════════════════════════════════════════════');

const getList  = await callApi('GET',  '/api/demos');
console.log(`\n  GET /api/demos → HTTP ${getList.status}`);
console.log(`  ${getList.body}`);

const getSpend = await callApi('GET',  '/api/demos/spend');
console.log(`\n  GET /api/demos/spend → HTTP ${getSpend.status}`);
console.log(`  ${getSpend.body}`);

const postMint = await callApi('POST', '/api/demos', { label: 'e2e-api-test' });
console.log(`\n  POST /api/demos (mint) → HTTP ${postMint.status}`);
console.log(`  ${postMint.body}`);

// If mint succeeded, also fetch list again to see the new token
if (postMint.status < 300) {
  const getList2 = await callApi('GET', '/api/demos');
  console.log(`\n  GET /api/demos (after mint) → HTTP ${getList2.status}`);
  // Show just the first token entry
  try {
    const parsed = JSON.parse(getList2.body);
    console.log(`  tokens count: ${parsed.tokens?.length ?? '?'}`);
    if (parsed.tokens?.[0]) {
      const t = parsed.tokens[0];
      console.log(`  latest token: label="${t.label}" jti="${t.jti}" revoked=${t.revoked}`);
    }
  } catch {
    console.log(`  ${getList2.body}`);
  }
}

// ── 5. Final summary ──────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  PASS / FAIL SUMMARY');
console.log('══════════════════════════════════════════════════════');

const checks = [
  { name: 'GET /api/demos',       status: getList.status,  max: 499 },
  { name: 'GET /api/demos/spend', status: getSpend.status, max: 499 },
  { name: 'POST /api/demos',      status: postMint.status, max: 399 },
];

let allOk = true;
for (const c of checks) {
  const ok = c.status <= c.max;
  if (!ok) allOk = false;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${c.name}  →  HTTP ${c.status}  (expected ≤ ${c.max})`);
}

console.log(`\n  Overall: ${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
console.log('══════════════════════════════════════════════════════\n');

process.exit(allOk ? 0 : 1);
