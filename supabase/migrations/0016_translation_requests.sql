-- Extend ai_call_log job_type check constraint to include 'translate'
ALTER TABLE ai_call_log DROP CONSTRAINT ai_call_log_job_type_check;
ALTER TABLE ai_call_log ADD CONSTRAINT ai_call_log_job_type_check
  CHECK (job_type IN ('ingestion', 'character_profile', 'culture_flags', 'consistency_check', 'untranslatable', 'translate'));

-- Store async translation results so the frontend can poll for them
CREATE TABLE translation_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  result     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'done', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE translation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own translation requests" ON translation_requests
  FOR ALL USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE translation_requests TO authenticated, service_role;
