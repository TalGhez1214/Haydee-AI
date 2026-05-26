CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_variants TEXT[] DEFAULT '{}',
  role TEXT DEFAULT 'secondary' CHECK (role IN ('protagonist', 'secondary', 'minor', 'narrator')),
  tone_tags TEXT[] DEFAULT '{}',
  translator_note TEXT,
  confirmed_target_name TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
