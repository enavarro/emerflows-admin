-- Phase 2: Demo RPC wrappers
-- Mirror existing RPCs but keyed on demo_sessions.jti instead of (name, cohort).
-- All wrappers force is_demo=true server-side — never trust client input.
--
-- Each wrapper:
--   1. Validates jti exists, not expired, not revoked
--   2. Resolves/creates the single learner bound to that jti (is_demo=true)
--   3. Delegates to equivalent logic with is_demo=true on all writes
--
-- Attempt caps are NOT enforced here — Redis edge middleware owns budget/rate.
-- These wrappers are the second line of defense (data isolation), not the first (cost control).

-- Helper: validate a demo session and return its learner_id (creating on first call).
-- Raises on invalid jti. Returns NULL only if jti is valid but unusable (shouldn't happen).
CREATE OR REPLACE FUNCTION _demo_resolve_learner(p_jti UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session     demo_sessions%ROWTYPE;
  v_learner_id  UUID;
  v_cohort      TEXT;
  v_name        TEXT;
BEGIN
  SELECT * INTO v_session FROM demo_sessions WHERE jti = p_jti FOR UPDATE;

  IF v_session.jti IS NULL THEN
    RAISE EXCEPTION 'demo session not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_session.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'demo session revoked' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.expires_at < NOW() THEN
    RAISE EXCEPTION 'demo session expired' USING ERRCODE = 'P0001';
  END IF;

  -- Reuse existing learner for this session if already created
  SELECT id INTO v_learner_id FROM learners WHERE demo_session_jti = p_jti;

  IF v_learner_id IS NOT NULL THEN
    RETURN v_learner_id;
  END IF;

  -- Create one — cohort uses a stable per-jti naming pattern for analytics grouping
  v_cohort := 'demo-' || substring(p_jti::text from 1 for 8);
  v_name   := COALESCE(v_session.display_name, 'Demo User');

  INSERT INTO learners (name, cohort, is_demo, demo_session_jti)
  VALUES (v_name, v_cohort, true, p_jti)
  RETURNING id INTO v_learner_id;

  RETURN v_learner_id;
END;
$$;

-- 1. check_attempt_status_demo — lookup attempt state for a demo session
CREATE OR REPLACE FUNCTION check_attempt_status_demo(
  p_jti    UUID,
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
  v_learner_id := _demo_resolve_learner(p_jti);

  PERFORM 1 FROM learners WHERE id = v_learner_id FOR UPDATE;

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

-- 2. save_conversation_draft_demo — upsert conversation draft for a demo session
CREATE OR REPLACE FUNCTION save_conversation_draft_demo(
  p_jti         UUID,
  p_module      TEXT,
  p_attempt_num SMALLINT,
  p_payload     JSONB,
  p_draft_id    UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id UUID;
  v_id         UUID;
BEGIN
  v_learner_id := _demo_resolve_learner(p_jti);

  IF p_draft_id IS NOT NULL THEN
    UPDATE submissions
    SET payload = p_payload
    WHERE id = p_draft_id
      AND learner_id = v_learner_id
      AND status = 'draft'
      AND is_demo = true
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'draft not found');
    END IF;

    RETURN json_build_object('ok', true, 'draft_id', v_id);
  END IF;

  INSERT INTO submissions (learner_id, module_id, type, attempt_num, payload, status, is_demo)
  VALUES (v_learner_id, p_module, 'conversation', p_attempt_num, p_payload, 'draft', true)
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'draft_id', v_id);
END;
$$;

-- 3. submit_draft_demo — transition a demo draft to submitted + bump usage counter
CREATE OR REPLACE FUNCTION submit_draft_demo(
  p_jti      UUID,
  p_draft_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id      UUID;
  v_submission      submissions%ROWTYPE;
  v_submitted_count INT;
BEGIN
  v_learner_id := _demo_resolve_learner(p_jti);

  SELECT * INTO v_submission
  FROM submissions
  WHERE id = p_draft_id
    AND learner_id = v_learner_id
    AND status = 'draft'
    AND is_demo = true
  FOR UPDATE;

  IF v_submission.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'draft not found');
  END IF;

  SELECT COUNT(*) INTO v_submitted_count
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = v_submission.module_id
    AND type       = v_submission.type
    AND status     = 'submitted';

  IF v_submitted_count >= 2 THEN
    RETURN json_build_object('ok', false, 'error', 'max attempts submitted');
  END IF;

  UPDATE submissions SET status = 'submitted' WHERE id = p_draft_id;
  UPDATE demo_sessions SET submissions_used = submissions_used + 1 WHERE jti = p_jti;

  RETURN json_build_object('ok', true, 'attempt_num', v_submission.attempt_num);
END;
$$;

-- 4. get_submitted_attempts_demo — list submitted attempts for a demo session
CREATE OR REPLACE FUNCTION get_submitted_attempts_demo(
  p_jti    UUID,
  p_module TEXT,
  p_type   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id UUID;
  v_attempts   JSON;
BEGIN
  v_learner_id := _demo_resolve_learner(p_jti);

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_attempts
  FROM (
    SELECT id, payload, status, attempt_num
    FROM submissions
    WHERE learner_id = v_learner_id
      AND module_id  = p_module
      AND type       = p_type
      AND status     = 'submitted'
    ORDER BY attempt_num ASC
  ) t;

  RETURN json_build_object(
    'found',    json_array_length(v_attempts) > 0,
    'attempts', v_attempts
  );
END;
$$;

-- 5. save_recording_submission_demo — recording save for a demo session
CREATE OR REPLACE FUNCTION save_recording_submission_demo(
  p_jti                  UUID,
  p_module               TEXT,
  p_attempt_num          SMALLINT,
  p_payload              JSONB,
  p_source_submission_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id UUID;
  v_id         UUID;
BEGIN
  v_learner_id := _demo_resolve_learner(p_jti);

  -- If source provided, verify it belongs to the same demo learner (prevent cross-session linking)
  IF p_source_submission_id IS NOT NULL THEN
    PERFORM 1 FROM submissions
    WHERE id = p_source_submission_id
      AND learner_id = v_learner_id
      AND is_demo = true;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'source submission not found');
    END IF;
  END IF;

  INSERT INTO submissions (
    learner_id, module_id, type, attempt_num, payload, status,
    source_submission_id, is_demo
  )
  VALUES (
    v_learner_id, p_module, 'recording', p_attempt_num, p_payload, 'submitted',
    p_source_submission_id, true
  )
  RETURNING id INTO v_id;

  UPDATE demo_sessions SET submissions_used = submissions_used + 1 WHERE jti = p_jti;

  RETURN json_build_object('ok', true, 'id', v_id);
END;
$$;

-- 6. get_latest_submission_demo — latest submission for a demo session (optional status filter)
CREATE OR REPLACE FUNCTION get_latest_submission_demo(
  p_jti    UUID,
  p_module TEXT,
  p_type   TEXT,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learner_id UUID;
  v_row        submissions%ROWTYPE;
BEGIN
  v_learner_id := _demo_resolve_learner(p_jti);

  SELECT * INTO v_row
  FROM submissions
  WHERE learner_id = v_learner_id
    AND module_id  = p_module
    AND type       = p_type
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN json_build_object(
    'found',       true,
    'id',          v_row.id,
    'status',      v_row.status,
    'attempt_num', v_row.attempt_num,
    'payload',     v_row.payload
  );
END;
$$;
