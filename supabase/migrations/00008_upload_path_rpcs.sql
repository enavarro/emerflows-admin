-- Phase 2.75: Upload-path RPCs
-- Replaces direct table reads in frontend/src/app/api/storage/upload-url/route.ts.
-- Before this, the route did `.from('learners').select(...)` + `.from('submissions').select(...)`
-- which bypasses is_demo enforcement — a demo request could read real learners or mint
-- signed URLs against real recording paths. These RPCs keep is_demo enforcement server-side.
--
-- The RPC returns learner_id + next attempt_num + file_path; the route mints the signed URL
-- from storage (Postgres can't issue signed URLs directly).

-- Non-demo: resolve real learner by (name, cohort), enforce is_demo=false.
CREATE OR REPLACE FUNCTION get_upload_path(
  p_name   TEXT,
  p_cohort TEXT,
  p_module TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id   UUID;
  v_attempt_num  INT;
  v_file_path    TEXT;
BEGIN
  SELECT id INTO v_learner_id
  FROM learners
  WHERE name = p_name
    AND cohort = p_cohort
    AND is_demo = false;

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

-- Demo: resolve learner by jti, enforce is_demo=true. Mirrors the 6 *_demo wrappers.
CREATE OR REPLACE FUNCTION get_upload_path_demo(
  p_jti    UUID,
  p_module TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id   UUID;
  v_cohort       TEXT;
  v_attempt_num  INT;
  v_file_path    TEXT;
BEGIN
  v_learner_id := _demo_resolve_learner(p_jti);

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
