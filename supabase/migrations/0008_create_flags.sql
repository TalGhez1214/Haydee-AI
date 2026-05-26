CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES chunks(id) ON DELETE SET NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('consistency', 'culture', 'untranslatable', 'glossary')),
  severity TEXT CHECK (severity IN ('high', 'medium', 'low')),
  passage TEXT,
  source_text TEXT,
  explanation TEXT,
  suggestions JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  translator_decision TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
