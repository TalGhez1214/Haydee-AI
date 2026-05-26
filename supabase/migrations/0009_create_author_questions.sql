CREATE TABLE author_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES chunks(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'pending', 'answered', 'resolved')),
  author_response TEXT,
  translator_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
