CREATE TABLE project_todos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'done')),
  priority       TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('high', 'medium', 'low')),
  linked_type    TEXT NOT NULL DEFAULT 'none'
                   CHECK (linked_type IN ('flag', 'character', 'glossary_term', 'author_question', 'none')),
  linked_id      UUID,
  auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_todos_project_id ON project_todos(project_id);
CREATE INDEX idx_project_todos_status     ON project_todos(project_id, status);
CREATE INDEX idx_project_todos_priority   ON project_todos(project_id, priority);
