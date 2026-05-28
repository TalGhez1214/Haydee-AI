import type { ProjectRow } from '@/types/database'

export const INGEST_SYSTEM_PROMPT = `You are a literary analysis assistant helping a professional translator prepare a translation project.

Your job is to analyze a chapter of a book and extract structured information from it. You must respond ONLY with valid JSON — no prose, no markdown, no explanation.

Focus on accuracy over completeness. It is better to extract fewer, high-confidence items than to hallucinate.`

export function buildIngestUserPrompt(
  project: Pick<ProjectRow, 'title' | 'author_name' | 'source_language' | 'target_language' | 'genre' | 'style_guide'>,
  chapterNumber: number,
  chapterText: string
): string {
  return `Book: "${project.title}" by ${project.author_name ?? 'Unknown'}
Source language: ${project.source_language}
Target language: ${project.target_language}
Genre: ${project.genre ?? 'Not specified'}
Translator style guide: ${project.style_guide ?? 'None provided'}

--- CHAPTER ${chapterNumber} TEXT ---
${chapterText}
--- END OF CHAPTER ---

Analyze this chapter and return a JSON object with this exact schema:

{
  "characters": [
    {
      "name": "string — canonical name as it appears in the text",
      "name_variants": ["string — alternative names, nicknames, pronouns used for this character in this chapter"],
      "role": "protagonist | narrator | secondary | minor",
      "first_appearance_quote": "string — verbatim short quote of the character's first meaningful appearance"
    }
  ],
  "glossary_candidates": [
    {
      "source_term": "string — the term in the source language",
      "term_type": "proper_noun | cultural_concept | title | idiom | technical | other",
      "context": "string — one-sentence explanation of why this term needs a translation decision",
      "frequency": "number — how many times this term appears in this chapter"
    }
  ],
  "culture_flags": [
    {
      "passage": "string — verbatim quote of the problematic passage (max 200 chars)",
      "paragraph_index": "number — approximate paragraph number in the chapter (1-based)",
      "flag_type": "idiom | cultural_reference | humor | dialect | register | other",
      "severity": "high | medium | low",
      "explanation": "string — why this passage is culturally non-portable",
      "suggestions": [
        { "approach": "string — name of the approach", "text": "string — example translation using this approach" }
      ]
    }
  ],
  "untranslatable_passages": [
    {
      "passage": "string — verbatim quote",
      "paragraph_index": "number",
      "type": "wordplay | pun | dialect | onomatopoeia | name_meaning | rhyme | other",
      "explanation": "string — why the form of this passage is untranslatable",
      "strategies": ["string — strategy option 1", "string — strategy option 2"]
    }
  ],
  "chapter_summary": "string — 2-3 sentence factual summary of this chapter's events"
}

Rules:
- Only extract characters who actually appear or are meaningfully referenced in this chapter
- Only flag glossary terms that genuinely require a translation decision
- Severity 'high' means meaning breaks without adaptation; 'medium' means nuance loss; 'low' means stylistic only
- Return empty arrays if there are no items to report in a category
- Do not invent content — only report what is in the text`
}
