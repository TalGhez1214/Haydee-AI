CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT,
  text TEXT NOT NULL,
  word_count INTEGER,
  character_mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
