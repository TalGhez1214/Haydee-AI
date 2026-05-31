CREATE TABLE research_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'research'
                     CHECK (category IN ('research', 'preface_draft', 'reference', 'bookmark')),
  tags             TEXT[]   NOT NULL DEFAULT '{}',
  linked_chapter   INT,
  linked_character UUID REFERENCES characters(id) ON DELETE SET NULL,
  bookmarks        JSONB    NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_notes_project_id ON research_notes(project_id);
CREATE INDEX idx_research_notes_category   ON research_notes(project_id, category);
CREATE INDEX idx_research_notes_tags       ON research_notes USING GIN(tags);
