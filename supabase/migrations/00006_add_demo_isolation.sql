-- Phase 2: Demo isolation schema
-- Adds is_demo flag on learners/submissions, demo_sessions + demo_usage_log tables,
-- views for demo/real separation, and a purge function (not scheduled — see note).
--
-- pg_cron scheduling is intentionally deferred — once paid tier + monitoring are in
-- place, add a 00008_schedule_demo_purge.sql with `SELECT cron.schedule(...)`.

-- 1. Demo-isolation columns
ALTER TABLE learners
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_session_jti UUID;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- 2. demo_sessions — one row per admin-minted token or LinkedIn OAuth session
CREATE TABLE IF NOT EXISTS demo_sessions (
  jti              UUID PRIMARY KEY,
  source           TEXT NOT NULL CHECK (source IN ('admin_link', 'linkedin_oauth')),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linkedin_sub     TEXT,
  email            TEXT,
  display_name     TEXT,
  label            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  revoked_at       TIMESTAMPTZ,
  submissions_used INT NOT NULL DEFAULT 0,
  est_cost_cents   INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS demo_sessions_expires_at_idx ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS demo_sessions_created_by_idx ON demo_sessions(created_by);

-- 3. FK from learners.demo_session_jti → demo_sessions.jti (one learner per session)
ALTER TABLE learners
  ADD CONSTRAINT learners_demo_session_jti_fkey
  FOREIGN KEY (demo_session_jti) REFERENCES demo_sessions(jti) ON DELETE CASCADE;

ALTER TABLE learners
  ADD CONSTRAINT learners_demo_session_jti_unique UNIQUE (demo_session_jti);

-- Integrity: is_demo and demo_session_jti must agree
ALTER TABLE learners
  ADD CONSTRAINT learners_is_demo_jti_consistent
  CHECK (
    (is_demo = true  AND demo_session_jti IS NOT NULL) OR
    (is_demo = false AND demo_session_jti IS NULL)
  );

-- 4. demo_usage_log — audit trail of billable calls (async fire-and-forget from app)
CREATE TABLE IF NOT EXISTS demo_usage_log (
  id             BIGSERIAL PRIMARY KEY,
  jti            UUID NOT NULL REFERENCES demo_sessions(jti) ON DELETE CASCADE,
  ip             INET,
  endpoint       TEXT NOT NULL,
  est_cost_cents INT NOT NULL DEFAULT 0,
  at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demo_usage_log_jti_at_idx ON demo_usage_log(jti, at DESC);
CREATE INDEX IF NOT EXISTS demo_usage_log_at_idx ON demo_usage_log(at DESC);

-- 5. Views — clean separation for admin dashboards
CREATE OR REPLACE VIEW real_learners    AS SELECT * FROM learners    WHERE is_demo = false;
CREATE OR REPLACE VIEW real_submissions AS SELECT * FROM submissions WHERE is_demo = false;
CREATE OR REPLACE VIEW demo_learners    AS SELECT * FROM learners    WHERE is_demo = true;
CREATE OR REPLACE VIEW demo_submissions AS SELECT * FROM submissions WHERE is_demo = true;

-- 6. Purge function — manual invocation until pg_cron scheduled (deferred)
--    Admin can run: SELECT purge_old_demo_data('7 days'::interval);
CREATE OR REPLACE FUNCTION purge_old_demo_data(p_older_than INTERVAL DEFAULT '7 days')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sessions_deleted INT;
  v_log_deleted      INT;
BEGIN
  -- Deleting demo_sessions cascades to learners (FK CASCADE) and submissions (via learners CASCADE)
  WITH deleted AS (
    DELETE FROM demo_sessions
    WHERE created_at < NOW() - p_older_than
    RETURNING jti
  )
  SELECT COUNT(*) INTO v_sessions_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM demo_usage_log
    WHERE at < NOW() - p_older_than
    RETURNING id
  )
  SELECT COUNT(*) INTO v_log_deleted FROM deleted;

  RETURN json_build_object(
    'sessions_deleted', v_sessions_deleted,
    'log_rows_deleted', v_log_deleted,
    'purged_older_than', p_older_than
  );
END;
$$;
