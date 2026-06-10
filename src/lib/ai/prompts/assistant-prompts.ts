import type { AssistantRAGContext } from '@/lib/ai/rag/context-builder'

interface Project {
  title: string
  author_name: string | null
  source_language: string
  target_language: string
  genre: string | null
}

export function buildAssistantSystemPrompt(project: Project, context?: AssistantRAGContext): string {
  const sections: string[] = []

  sections.push(
    `You are Haydee, an AI co-pilot for literary translators. ` +
      `You are assisting with "${project.title}" by ${project.author_name ?? 'unknown author'}, ` +
      `translated from ${project.source_language} to ${project.target_language}` +
      (project.genre ? ` (${project.genre})` : '') +
      `.`
  )

  if (context?.relevantChapters?.length) {
    const chapterLines = context.relevantChapters.map((c) => {
      const title = c.chapter_title ? ` — "${c.chapter_title}"` : ''
      return `Chapter ${c.chapter_number}${title}: ${c.summary}`
    })
    sections.push(`## Relevant Chapter Summaries\n${chapterLines.join('\n')}`)
  }

  if (context?.characters?.length) {
    const charLines = context.characters.map((c) => {
      const parts: string[] = [`- ${c.name} (${c.role})`]
      if (c.confirmed_target_name) parts.push(`→ "${c.confirmed_target_name}"`)
      if (c.tone_tags.length > 0) parts.push(`[${c.tone_tags.join(', ')}]`)
      if (c.translator_note) parts.push(`Note: ${c.translator_note}`)
      return parts.join(' · ')
    })
    sections.push(`## Characters\n${charLines.join('\n')}`)
  }

  if (context?.approvedGlossary?.length) {
    const termLines = context.approvedGlossary.map(
      (t) =>
        `- "${t.source_term}" → "${t.approved_translation}"` +
        (t.term_type ? ` (${t.term_type})` : '')
    )
    sections.push(`## Approved Glossary\n${termLines.join('\n')}`)
  }

  sections.push(
    `Answer questions about language, culture, literary tradition, and translation craft. ` +
      `Be thorough but concise. Use markdown for structure when helpful.`
  )

  return sections.join('\n\n')
}
