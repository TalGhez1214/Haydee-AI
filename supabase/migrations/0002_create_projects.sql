CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author_name TEXT,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  genre TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'review', 'delivered', 'archived')),
  word_count_total INTEGER DEFAULT 0,
  word_count_translated INTEGER DEFAULT 0,
  deadline DATE,
  style_guide TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
