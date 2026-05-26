CREATE TABLE ai_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('ingestion', 'character_profile', 'culture_flags', 'consistency_check', 'untranslatable')),
  model_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10, 6),
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
