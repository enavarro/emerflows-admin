-- Add source_submission_id to link recording submissions to their source conversation
ALTER TABLE submissions
  ADD COLUMN source_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL;

-- Update save_recording_submission to accept the new parameter
CREATE OR REPLACE FUNCTION save_recording_submission(
  p_learner_id UUID,
  p_module TEXT,
  p_attempt_num SMALLINT,
  p_payload JSONB,
  p_source_submission_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO submissions (learner_id, module_id, type, attempt_num, payload, status, source_submission_id)
  VALUES (p_learner_id, p_module, 'recording', p_attempt_num, p_payload, 'submitted', p_source_submission_id)
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'id', v_id);
END;
$$;
