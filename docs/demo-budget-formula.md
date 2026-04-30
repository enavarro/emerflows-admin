# Demo Budget — Cost Formula & Storage

Learnings from Phase 4 build (2026-04-15). Covers how demo-mode spend is
estimated, stored, and capped. Applies to `demo.emerflows.com` only —
`DEMO_MODE=true` gates all of this; `app.emerflows.com` (real students) is
untouched.

---

## Storage

**Upstash Redis only.** Key format:

```
demo:spend:YYYY-MM-DD    (value = integer cents spent today, UTC)
```

- Lives in the Upstash instance `emerflows-demo-ratelimit`, shared by both
  repos (terenure-proyect writes, emerflows-admin reads for the gauge).
- No Postgres mirror — chosen for atomic `INCRBY` under concurrent load.
- Key auto-rotates at UTC midnight (new date = fresh counter). Old keys
  persist until Upstash's `allkeys-lru` eviction reclaims them — not
  deleted explicitly.
- Admin's spend gauge reads the same key via `GET demo:spend:<today>`
  (`src/app/api/demos/spend/route.ts`).

---

## How the number is calculated

**Pre-charge, per-call estimate — NOT actual vendor billing.** Hardcoded
cents constants baked into each billable route:

| Route | Const | Fires when |
|---|---|---|
| `api/elevenlabs-token` | `55` | Every session start (worst-case: 210s × ~$0.15/min ≈ $0.53) |
| `api/gemini` (classify/summary) | `1` | Each small Gemini call |
| `api/gemini` (analyze-recording) | `10` | Recording analysis call |

Logic in `frontend/src/lib/demo-budget.ts`:

```
reserveBudget(estCents):
  cap  = DEMO_DAILY_BUDGET_CENTS (env)
  key  = "demo:spend:" + today(UTC)
  post = INCRBY(key, estCents)        ← atomic, single round trip
  if post > cap:
      INCRBY(key, -estCents)          ← best-effort refund
      return false                    ← caller returns 429
  return true                         ← caller proceeds with vendor call
```

**Why atomic INCRBY, not a `SUM` check-then-write:** 200 concurrent callers
would all read "$0 < cap" before any row writes, blowing through the
budget. `INCRBY` returns the post-increment value in one op, so only the
Nth caller that actually pushes over the line sees `post > cap` and
rejects.

**Fail-closed:** if Upstash throws, `reserveBudget` rejects → route returns
503 → vendor API never called. Seen in prod when `DEMO_DAILY_BUDGET_CENTS`
env var was missing on the emerflows-demo Vercel project.

---

## Cost formula — full breakdown

### 1. ElevenLabs Conversational AI (voice conversation)

**Route:** `api/elevenlabs-token` — fires once per session start
**Constant:** `ELEVENLABS_EST_CENTS = 55`

**Derivation:**
```
max_duration_seconds   = 210 s          (agent console hard cap, Phase 2.5)
ElevenLabs Conv AI price ≈ $0.15 / min  (as of 2026-04, check dashboard)
worst-case cost        = (210 / 60) × $0.15
                       = 3.5 × $0.15
                       = $0.525
rounded up             = 55 ¢
```

**Variables & assumptions:**
- `210` — vendor-enforced in the ElevenLabs agent config, so it applies
  even if the JWT is stolen and replayed from a script.
- `$0.15/min` — ElevenLabs public rate; shifts with their pricing or your
  plan tier. Not read from env, hardcoded in the route.
- User may hang up at 10s — still charged 55¢ in Redis, no refund.
- TTS + STT + LLM bundled into the per-minute rate (no separate breakdown).

### 2. Gemini — classify / summary

**Route:** `api/gemini` (small calls)
**Constant:** `1` cent

**Derivation (rough):**
```
Gemini 1.5 Flash input  ≈ $0.075 / 1M tokens
Gemini 1.5 Flash output ≈ $0.30  / 1M tokens
typical classify prompt ≈ 500 input tokens + 50 output tokens
cost                    = (500/1M × $0.075) + (50/1M × $0.30)
                        = $0.0000375 + $0.000015
                        ≈ $0.00005   (fractional cent)
```

Rounded to **1¢** as a floor (can't subtract sub-cent, daily cap only
makes sense in integer cents). Massively over-estimates real cost —
deliberately conservative.

### 3. Gemini — analyze-recording

**Constant:** `10` cents

**Derivation:**
```
analyze-recording sends the full transcript + audio features + rubric
typical: ~3000 input tokens + 800 output tokens (JSON rubric response)
cost     = (3000/1M × $0.075) + (800/1M × $0.30)
         = $0.000225 + $0.00024
         ≈ $0.00047  (<0.1¢)
```

Rounded up to **10¢** as conservative floor. Accounts for possible
multi-turn prompts or larger recordings.

### 4. Per-session maximum spend

Plan limits: `maxSubmissions = 2`, so each demo session does at most:

```
1 × ElevenLabs token call       = 55¢
1 × classify/summary per submit  =  1¢ × 2 = 2¢
1 × analyze-recording per submit = 10¢ × 2 = 20¢
                            total ≈ 77¢  ceiling per JWT
```

### 5. Daily global cap

```
DEMO_DAILY_BUDGET_CENTS   (env var, per-project on Vercel)
```

**Sizing logic** — how many demo sessions you can afford per day:
```
sessions_per_day ≈ DEMO_DAILY_BUDGET_CENTS / 77¢
e.g.  500¢  ($5/day)  → ~6  sessions
     2000¢  ($20/day) → ~26 sessions
     5000¢  ($50/day) → ~65 sessions
```

### 6. Counter math

```
key    = "demo:spend:" + YYYY-MM-DD (UTC)
post   = INCRBY(key, est_cents)        ← atomic
if post > DEMO_DAILY_BUDGET_CENTS:
    INCRBY(key, -est_cents)            ← best-effort refund
    reject (429)
else:
    proceed with vendor call
```

---

## Known imprecisions (by design)

| Missing | Impact |
|---|---|
| Actual vendor usage reconciliation | Redis counter drifts from ElevenLabs/Gemini invoices |
| Sub-cent precision | Gemini is rounded up 20×–1000× |
| Refund on early hangup | User talks 5s, still costs 55¢ in counter |
| Per-JWT spend attribution | Can't answer "how much did token X burn" |
| Per-module cost variance | Longer modules cost same as short ones in the counter |
| Price updates | Hardcoded 55/1/10 — if ElevenLabs raises rates, code must change |
| Currency | USD only, FX ignored |
| Storage / Supabase / Vercel fees | Not in this estimate — only vendor API calls |
| Kill-switch trip cost | GCP billing budget is a separate, independent firewall |
| No durable audit | Originally planned `demo_usage_log` Postgres mirror deferred; if Upstash flushes, today's spend history is gone |

---

## To adjust

- **Change constants:** edit `ELEVENLABS_EST_CENTS` in
  `terenure-proyect/frontend/src/app/api/elevenlabs-token/route.ts`, and
  the inline numbers in `terenure-proyect/frontend/src/app/api/gemini/route.ts`.
- **Change daily cap:** set `DEMO_DAILY_BUDGET_CENTS` env var on the
  **emerflows-demo** Vercel project (and mirror to admin if you want the
  gauge label to match) — redeploy required.
- **Change per-JWT caps:** hardcoded in the admin mint route
  (`HARDCODED_MAX_SUBMISSIONS=2`, `HARDCODED_MAX_CONVERSATION_SEC=210`)
  and must match the ElevenLabs agent console cap.

---

## Where this is enforced (defense in depth)

1. **Vendor console** (ElevenLabs agent `max_duration_seconds=210`,
   Google Cloud billing budget + kill-switch) — primary firewall, applies
   even if every layer below is bypassed.
2. **Edge middleware** (`terenure-proyect/frontend/middleware.ts`) —
   per-IP rate limit, per-JWT attempt cap, JWT revocation check. Runs
   before serverless routes spin up.
3. **`reserveBudget()`** in billable routes — atomic daily spend cap.
   This document describes layer 3.
4. **RPC wrappers** (Supabase) — enforce `is_demo=true` on writes so demo
   data can never pollute real analytics.
