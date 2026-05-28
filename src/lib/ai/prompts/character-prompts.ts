import type { CharacterRow } from '@/types/database'

export const CHARACTER_SYSTEM_PROMPT = `You are a character voice analyst helping a literary translator understand how a character speaks and thinks.

Your job is to analyze textual evidence and produce a concise voice profile for a specific character. You must respond ONLY with valid JSON — no prose, no markdown, no explanation.

Be precise and evidence-based. Every tone descriptor must be backed by a verbatim quote.`

export function buildCharacterUserPrompt(
  character: Pick<CharacterRow, 'name' | 'name_variants' | 'role'>,
  passages: string[]
): string {
  return `Character: "${character.name}"
Also referred to as: ${character.name_variants.length > 0 ? character.name_variants.join(', ') : 'no known variants'}
Role: ${character.role}

--- PASSAGES FEATURING THIS CHARACTER ---
${passages.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}
--- END OF PASSAGES ---

Analyze these passages and return a JSON object with this exact schema:

{
  "character": "string — the character's name",
  "tone_suggestions": [
    {
      "tag": "string — a single evocative adjective describing a tone quality (e.g. 'Sardonic', 'Earnest', 'Volatile')",
      "evidence": "string — a verbatim quote from the passages above that exemplifies this tone"
    }
  ]
}

Rules:
- Generate EXACTLY 3 tone_suggestions — no more, no fewer
- Each tag must be a single adjective that captures a distinct quality of voice or personality
- Each evidence quote must be verbatim from the passages provided above — do not paraphrase
- Tags should describe HOW the character communicates, not WHAT they do (tone, not plot)
- Prioritize qualities that will help a translator make consistent word choices`
}
