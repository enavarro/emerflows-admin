-- Phase 2.75 hardening: address security review findings.
--   1. Validate p_module / p_name / p_cohort inside the RPC (defense in depth)
--   2. Take a row lock on the learner before counting attempts (race on attempt_num)
--   3. Pin search_path on SECURITY DEFINER functions (00007 + 00008)
--
-- Parked as TODO (not in this migration): REVOKE EXECUTE ... FROM anon on the
-- *_demo and get_upload_path* RPCs. Requires switching the student-app route from
-- anon key to service_role first.

CREATE OR REPLACE FUNCTION get_upload_path(
  p_name   TEXT,
  p_cohort TEXT,
  p_module TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_learner_id   UUID;
  v_attempt_num  INT;
  v_file_path    TEXT;
BEGIN
  IF p_module IS NULL OR p_module !~ '^[a-zA-Z0-9_-]{1,64}$' THEN
    RAISE EXCEPTION 'invalid module id' USING ERRCODE = '22023';
  END IF;
  IF p_cohort IS NULL OR p_cohort !~ '^[a-zA-Z0-9_-]{1,64}$' THEN
    RAISE EXCEPTION 'invalid cohort id' USING ERRCODE = '22023';
  END IF;
  IF p_name IS NULL OR length(p_name) = 0 OR length(p_name) > 100 THEN
    RAISE EXCEPTION 'invalid name' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_learner_id
  FROM learners
  WHERE name = p_name
    AND cohort = p_cohort
    AND is_demo = false
  FOR UPDATE;

  IF v_learner_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'learner not found');
  END IF;

  SELECT COUNT(*) + 1 INTO v_attempt_num
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = p_module
    AND type       = 'recording'
    AND is_demo    = false;

  v_file_path := 'recordings/' || p_cohort || '/' || v_learner_id::text
                 || '/' || p_module || '-attempt-' || v_attempt_num || '.webm';

  RETURN json_build_object(
    'ok',          true,
    'learner_id',  v_learner_id,
    'attempt_num', v_attempt_num,
    'file_path',   v_file_path
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_upload_path_demo(
  p_jti    UUID,
  p_module TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_learner_id   UUID;
  v_cohort       TEXT;
  v_attempt_num  INT;
  v_file_path    TEXT;
BEGIN
  IF p_module IS NULL OR p_module !~ '^[a-zA-Z0-9_-]{1,64}$' THEN
    RAISE EXCEPTION 'invalid module id' USING ERRCODE = '22023';
  END IF;

  v_learner_id := _demo_resolve_learner(p_jti);

  -- Lock the learner row to serialize concurrent attempt_num counters
  PERFORM 1 FROM learners WHERE id = v_learner_id FOR UPDATE;

  v_cohort := 'demo-' || substring(p_jti::text from 1 for 8);

  SELECT COUNT(*) + 1 INTO v_attempt_num
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = p_module
    AND type       = 'recording'
    AND is_demo    = true;

  v_file_path := 'recordings/' || v_cohort || '/' || v_learner_id::text
                 || '/' || p_module || '-attempt-' || v_attempt_num || '.webm';

  RETURN json_build_object(
    'ok',          true,
    'learner_id',  v_learner_id,
    'attempt_num', v_attempt_num,
    'file_path',   v_file_path
  );
END;
$$;

-- Pin search_path on existing 00007 SECURITY DEFINER functions
ALTER FUNCTION _demo_resolve_learner(UUID)                                       SET search_path = public, pg_temp;
ALTER FUNCTION check_attempt_status_demo(UUID, TEXT, TEXT)                       SET search_path = public, pg_temp;
ALTER FUNCTION save_conversation_draft_demo(UUID, TEXT, SMALLINT, JSONB, UUID)   SET search_path = public, pg_temp;
ALTER FUNCTION submit_draft_demo(UUID, UUID)                                     SET search_path = public, pg_temp;
ALTER FUNCTION get_submitted_attempts_demo(UUID, TEXT, TEXT)                     SET search_path = public, pg_temp;
ALTER FUNCTION save_recording_submission_demo(UUID, TEXT, SMALLINT, JSONB, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION get_latest_submission_demo(UUID, TEXT, TEXT, TEXT)                SET search_path = public, pg_temp;
ALTER FUNCTION purge_old_demo_data(INTERVAL)                                     SET search_path = public, pg_temp;
