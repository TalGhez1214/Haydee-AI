export const CONSISTENCY_SYSTEM_PROMPT = `You are a translation consistency auditor helping a literary translator catch deviations from approved decisions in their working translation.

Your job is to compare a translator's working translation against a set of approved decisions (character names, glossary terms) and identify any inconsistencies. You must respond ONLY with valid JSON — no prose, no markdown, no explanation.

You are working ONLY with the target-language translation text. You do not need to read the source manuscript. Your sole task is to check the translation against the approved decisions provided.`

export function buildConsistencyUserPrompt(
  approvedCharacters: Array<{ name: string; confirmed_target_name: string | null; variants: string[] }>,
  approvedGlossary: Array<{ source_term: string; approved_translation: string | null }>,
  translationText: string
): string {
  const characterRules = approvedCharacters
    .filter((c) => c.confirmed_target_name)
    .map((c) => `- "${c.name}" → must appear as "${c.confirmed_target_name}"`)
    .join('\n')

  const glossaryRules = approvedGlossary
    .filter((g) => g.approved_translation)
    .map((g) => `- "${g.source_term}" → must appear as "${g.approved_translation}"`)
    .join('\n')

  return `Approved character name translations:
${characterRules || '(none confirmed yet)'}

Approved glossary term translations:
${glossaryRules || '(none approved yet)'}

--- TRANSLATOR'S WORKING TRANSLATION ---
${translationText}
--- END OF TRANSLATION ---

Scan the translation above for any deviation from the approved decisions and return a JSON object with this exact schema:

{
  "consistency_flags": [
    {
      "type": "name_inconsistency | term_deviation",
      "source_text": "string — the source term or character name that has a rule",
      "translated_text": "string — what the translator actually wrote",
      "approved_translation": "string — what the translator should have written",
      "suggestion": "string — brief instruction for the correction",
      "paragraph_index": "number — approximate paragraph number (1-based) where this occurs"
    }
  ]
}

Rules:
- Only flag actual deviations — do not flag passages that comply with approved decisions
- If the same deviation appears multiple times, report each occurrence separately with its own paragraph_index
- Return { "consistency_flags": [] } if the translation is fully consistent
- Do not add flags for decisions that have not been approved yet`
}
