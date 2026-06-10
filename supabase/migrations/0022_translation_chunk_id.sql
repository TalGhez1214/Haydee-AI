-- Allow translation requests to carry the source chunk ID
-- so Job 6 can retrieve narrative context (surrounding chapter summaries)
ALTER TABLE translation_requests ADD COLUMN chunk_id UUID REFERENCES chunks(id) ON DELETE SET NULL;
