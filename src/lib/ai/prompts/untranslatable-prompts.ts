export const UNTRANSLATABLE_SYSTEM_PROMPT = `You are a literary translation specialist helping a translator identify passages where the form of the source language — not just the meaning — carries significance.

Your job is to find passages where direct translation is structurally impossible because the meaning is inseparable from the linguistic form: wordplay, puns, dialect, onomatopoeia, names with embedded meaning, rhyme schemes, sound symbolism, or any other case where the FORM of the language matters. You must respond ONLY with valid JSON — no prose, no markdown, no explanation.

Do not flag passages simply because they are difficult to translate. Only flag passages where something structurally irreplaceable is at stake.`

export function buildUntranslatableUserPrompt(
  sourceLanguage: string,
  chapterNumber: number,
  chapterText: string
): string {
  return `Source language: ${sourceLanguage}
Chapter: ${chapterNumber}

--- CHAPTER TEXT ---
${chapterText}
--- END OF CHAPTER ---

Find passages where the form of the ${sourceLanguage} language carries meaning that cannot survive direct translation, and return a JSON object with this exact schema:

{
  "untranslatable_passages": [
    {
      "passage": "string — verbatim quote of the passage (max 300 chars)",
      "chapter": ${chapterNumber},
      "paragraph_index": "number — approximate paragraph number (1-based)",
      "type": "wordplay | pun | dialect | onomatopoeia | name_meaning | rhyme | sound_symbolism | register | other",
      "explanation": "string — a precise explanation of what is untranslatable and why",
      "strategies": [
        "string — strategy option (e.g. 'Preserve meaning, sacrifice form', 'Find target-language equivalent', 'Flag for author consultation', 'Expand with translator note')"
      ]
    }
  ]
}

Rules:
- Include 2–4 strategy options per passage
- Be precise in the explanation — explain the SPECIFIC linguistic mechanism that is lost
- Return { "untranslatable_passages": [] } if there are genuinely no untranslatable passages
- Quality over quantity — only flag passages that a professional translator would genuinely need to wrestle with`
}
