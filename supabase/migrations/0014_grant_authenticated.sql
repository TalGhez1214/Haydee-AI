GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  users,
  projects,
  manuscripts,
  chunks,
  project_memory,
  characters,
  glossary_terms,
  flags,
  author_questions,
  ai_call_log,
  stripe_events
TO authenticated, service_role;
