-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add chapter summary column to chunks (produced by Job 1)
ALTER TABLE chunks ADD COLUMN summary TEXT;

-- Add embedding column (voyage-3-lite = 512 dims)
ALTER TABLE chunks ADD COLUMN embedding vector(512);

-- HNSW index for fast cosine similarity search
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

-- Semantic search function: finds the top-K chunks most relevant to a query
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(512),
  match_project_id uuid,
  match_count int DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  chapter_number int,
  chapter_title text,
  summary text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.chapter_number,
    c.chapter_title,
    c.summary,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN manuscripts m ON c.manuscript_id = m.id
  WHERE m.project_id = match_project_id
    AND c.embedding IS NOT NULL
    AND c.summary IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Extend ai_call_log job_type to include embedding jobs
ALTER TABLE ai_call_log DROP CONSTRAINT ai_call_log_job_type_check;
ALTER TABLE ai_call_log ADD CONSTRAINT ai_call_log_job_type_check
  CHECK (job_type IN (
    'ingestion',
    'character_profile',
    'culture_flags',
    'consistency_check',
    'untranslatable',
    'translate',
    'assistant',
    'embeddings'
  ));
