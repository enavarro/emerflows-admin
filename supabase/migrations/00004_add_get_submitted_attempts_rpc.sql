-- Fetch all submitted attempts for a learner/module/type (used for attempt toggle)
CREATE OR REPLACE FUNCTION get_submitted_attempts(
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
  v_attempts   JSON;
BEGIN
  SELECT id INTO v_learner_id
  FROM learners
  WHERE name = p_name AND cohort = p_cohort;

  IF v_learner_id IS NULL THEN
    RETURN json_build_object('found', false, 'attempts', '[]'::json);
  END IF;

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
    'found', json_array_length(v_attempts) > 0,
    'attempts', v_attempts
  );
END;
$$;
