CREATE TABLE project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  characters JSONB DEFAULT '[]',
  glossary JSONB DEFAULT '[]',
  resolved_culture_flags JSONB DEFAULT '[]',
  open_culture_flags JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
