ALTER TABLE characters
  ADD CONSTRAINT characters_project_id_name_key UNIQUE (project_id, name);

ALTER TABLE glossary_terms
  ADD CONSTRAINT glossary_terms_project_id_source_term_key UNIQUE (project_id, source_term);
