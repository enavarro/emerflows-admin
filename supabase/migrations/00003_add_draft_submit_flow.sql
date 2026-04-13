-- Phase 2: Draft/Submit flow for conversation attempts
-- Adds status column, updates RPC to count only submitted attempts,
-- adds submit_draft RPC, and adds external_id index.

-- 1. Add status column (default 'submitted' so existing rows are correct)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'
  CHECK (status IN ('draft', 'submitted'));

-- 2. Index for external_id lookups
CREATE UNIQUE INDEX IF NOT EXISTS learners_external_id_cohort_idx
ON learners(external_id, cohort) WHERE external_id IS NOT NULL;

-- 3. Updated check_attempt_status — counts only submitted, returns draft info
CREATE OR REPLACE FUNCTION check_attempt_status(
  p_name   TEXT,
  p_cohort TEXT,
  p_module TEXT,
  p_type   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id UUID;
  v_count      INT;
  v_draft_id   UUID;
BEGIN
  INSERT INTO learners (name, cohort)
  VALUES (p_name, p_cohort)
  ON CONFLICT (name, cohort) DO NOTHING;

  SELECT id INTO v_learner_id
  FROM learners
  WHERE name = p_name AND cohort = p_cohort
  FOR UPDATE;

  SELECT COUNT(*) INTO v_count
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = p_module
    AND type       = p_type
    AND status     = 'submitted';

  SELECT id INTO v_draft_id
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = p_module
    AND type       = p_type
    AND status     = 'draft'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'learner_id',    v_learner_id,
    'attempt_count', v_count,
    'locked',        v_count >= 2,
    'has_draft',     v_draft_id IS NOT NULL,
    'draft_id',      v_draft_id
  );
END;
$$;

-- 4. New submit_draft RPC — atomically transitions draft to submitted
CREATE OR REPLACE FUNCTION submit_draft(
  p_draft_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission RECORD;
  v_submitted_count INT;
BEGIN
  SELECT * INTO v_submission
  FROM submissions
  WHERE id = p_draft_id AND status = 'draft'
  FOR UPDATE;

  IF v_submission IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Draft not found or already submitted');
  END IF;

  SELECT COUNT(*) INTO v_submitted_count
  FROM submissions
  WHERE learner_id = v_submission.learner_id
    AND module_id  = v_submission.module_id
    AND type       = v_submission.type
    AND status     = 'submitted';

  IF v_submitted_count >= 2 THEN
    RETURN json_build_object('ok', false, 'error', 'Max attempts already submitted');
  END IF;

  UPDATE submissions SET status = 'submitted' WHERE id = p_draft_id;

  RETURN json_build_object(
    'ok', true,
    'attempt_num', v_submission.attempt_num
  );
END;
$$;
