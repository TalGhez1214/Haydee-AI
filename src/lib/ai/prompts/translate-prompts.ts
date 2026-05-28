import type { ProjectRow, GlossaryTermRow, CharacterRow } from '@/types/database'

export const TRANSLATE_SYSTEM_PROMPT = `You are an expert literary translator assistant. Produce a single, high-quality translation of the passage provided.

Respond with ONLY the translated text — no explanations, preamble, quotation marks, or commentary.

Priorities:
- Fidelity to the source meaning and register
- Natural, idiomatic flow in the target language
- Consistency with approved glossary terms and character names provided
- Preserve each character's voice as described in their tone profile
- Respect the project style guide if given`

export function buildTranslateUserPrompt(
  project: Pick<ProjectRow, 'source_language' | 'target_language' | 'style_guide'>,
  selectedText: string,
  glossaryTerms: GlossaryTermRow[],
  characters: CharacterRow[]
): string {
  const sections: string[] = []

  sections.push(`Translate from ${project.source_language} to ${project.target_language}.`)

  if (project.style_guide) {
    sections.push(`Style guide:\n${project.style_guide}`)
  }

  // Only terms the translator has explicitly approved
  const approvedTerms = glossaryTerms.filter((t) => t.approved_translation)
  if (approvedTerms.length > 0) {
    const list = approvedTerms
      .map((t) => `  "${t.source_term}" → "${t.approved_translation}"`)
      .join('\n')
    sections.push(`Approved glossary terms (use these exact translations):\n${list}`)
  }

  // Characters appearing in this passage
  const confirmedChars = characters.filter(
    (c) => c.confirmed_target_name || c.tone_tags.length > 0 || c.translator_note
  )
  if (confirmedChars.length > 0) {
    const charLines = confirmedChars.map((c) => {
      const parts: string[] = [`  ${c.name}`]
      if (c.confirmed_target_name) parts.push(`→ ${c.confirmed_target_name}`)
      if (c.tone_tags.length > 0) parts.push(`[${c.tone_tags.join(', ')}]`)
      if (c.translator_note) parts.push(`Note: ${c.translator_note}`)
      return parts.join(' · ')
    })
    sections.push(`Characters in this passage:\n${charLines.join('\n')}`)
  }

  sections.push(`Passage:\n${selectedText}`)

  return sections.join('\n\n')
}
