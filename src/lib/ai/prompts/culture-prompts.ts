export const CULTURE_SYSTEM_PROMPT = `You are a cultural adaptation specialist helping a literary translator identify passages that require cultural adaptation decisions.

Your job is to read a chapter and find passages that are culturally embedded in the source language or culture in ways that will not transfer directly to the target culture. You must respond ONLY with valid JSON — no prose, no markdown, no explanation.

Not every cultural reference needs flagging — only flag passages where a translator genuinely needs to make an adaptation decision. Idioms, humor, cultural rituals, regional references, and register-specific language are candidates.`

export function buildCultureUserPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  genre: string | null,
  chapterNumber: number,
  chapterText: string
): string {
  return `Source language: ${sourceLanguage}
Target language: ${targetLanguage}
Genre: ${genre ?? 'Not specified'}
Chapter: ${chapterNumber}

--- CHAPTER TEXT ---
${chapterText}
--- END OF CHAPTER ---

Identify culturally non-portable passages and return a JSON object with this exact schema:

{
  "flags": [
    {
      "passage": "string — verbatim quote of the passage (max 200 chars)",
      "chapter": ${chapterNumber},
      "paragraph_index": "number — approximate paragraph number (1-based)",
      "flag_type": "idiom | cultural_reference | humor | dialect | register | food | gesture | institution | other",
      "severity": "high | medium | low",
      "explanation": "string — why this passage is culturally non-portable from ${sourceLanguage} to ${targetLanguage}",
      "suggestions": [
        {
          "approach": "string — name of the adaptation approach (e.g. 'Cultural equivalent', 'Literal + translator note', 'Expand meaning')",
          "text": "string — example translation using this approach in ${targetLanguage}"
        }
      ]
    }
  ]
}

Severity guide:
- high: Meaning breaks or becomes nonsensical without adaptation
- medium: Some nuance or cultural resonance is lost but meaning survives
- low: Stylistic or tonal mismatch only

Rules:
- Include at least 2 but no more than 3 suggestions per flag
- Return { "flags": [] } if there are genuinely no culture flags in this chapter
- Do not flag passages that translate cleanly without adaptation`
}
