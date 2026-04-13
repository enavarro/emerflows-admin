-- Phase 1 Foundation Schema
-- Creates learners table, submissions table, and check_attempt_status RPC

-- Learners table
CREATE TABLE learners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  cohort      TEXT NOT NULL,
  external_id TEXT,                          -- optional Canvas LMS user ID (DB-04)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, cohort)
);

-- Submissions table (one row per attempt, conversation or recording)
CREATE TABLE submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  module_id   TEXT NOT NULL,               -- e.g. 'module-01' (DB-02)
  type        TEXT NOT NULL CHECK (type IN ('conversation', 'recording')),
  attempt_num SMALLINT NOT NULL CHECK (attempt_num IN (1, 2)),
  payload     JSONB,                       -- structured result data (Phase 2 fills this)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (learner_id, module_id, type, attempt_num)
);

-- Atomic attempt check RPC (ATT-01)
-- Upserts learner, locks the learner row to serialize concurrent requests,
-- counts existing submissions, and returns { learner_id, attempt_count, locked }.
CREATE OR REPLACE FUNCTION check_attempt_status(
  p_name   TEXT,
  p_cohort TEXT,
  p_module TEXT,
  p_type   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_learner_id UUID;
  v_count      INT;
BEGIN
  -- Upsert learner: create on first visit, find on return
  INSERT INTO learners (name, cohort)
  VALUES (p_name, p_cohort)
  ON CONFLICT (name, cohort) DO NOTHING;

  -- Lock the learner row to serialize concurrent requests for the same student
  SELECT id INTO v_learner_id
  FROM learners
  WHERE name = p_name AND cohort = p_cohort
  FOR UPDATE;

  -- Count existing attempts for this (learner, module, type)
  SELECT COUNT(*) INTO v_count
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = p_module
    AND type       = p_type;

  RETURN json_build_object(
    'learner_id',    v_learner_id,
    'attempt_count', v_count,
    'locked',        v_count >= 2
  );
END;
$$;
