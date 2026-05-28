-- Per-chapter draft translation (JSONB map of paragraph index → translated text)
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS draft_translation JSONB;

-- Timestamp set when the translator marks a chapter as fully translated
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;
