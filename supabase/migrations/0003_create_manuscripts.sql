CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  word_count INTEGER,
  chapter_count INTEGER,
  file_name TEXT,
  file_format TEXT CHECK (file_format IN ('docx', 'pdf', 'txt', 'epub')),
  storage_url TEXT,
  parsed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
