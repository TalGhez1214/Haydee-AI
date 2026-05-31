ALTER TABLE project_todos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_via_project" ON project_todos FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "notes_via_project" ON research_notes FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

GRANT ALL ON project_todos  TO authenticated;
GRANT ALL ON research_notes TO authenticated;
