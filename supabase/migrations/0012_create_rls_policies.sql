-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_log ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY "users_own" ON users FOR ALL USING (auth.uid() = id);

-- Projects: own projects only
CREATE POLICY "projects_own" ON projects FOR ALL USING (auth.uid() = user_id);

-- All project-linked tables: access via project ownership
CREATE POLICY "manuscripts_via_project" ON manuscripts FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "chunks_via_project" ON chunks FOR ALL
  USING (manuscript_id IN (
    SELECT id FROM manuscripts WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "project_memory_via_project" ON project_memory FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "characters_via_project" ON characters FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "glossary_terms_via_project" ON glossary_terms FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "flags_via_project" ON flags FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "author_questions_via_project" ON author_questions FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "ai_call_log_own" ON ai_call_log FOR ALL
  USING (auth.uid() = user_id);
