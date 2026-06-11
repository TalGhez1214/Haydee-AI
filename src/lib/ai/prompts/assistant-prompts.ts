import type { AssistantRAGContext } from '@/lib/ai/rag/context-builder'

interface Project {
  title: string
  author_name: string | null
  source_language: string
  target_language: string
  genre: string | null
}

// ─── Scope check ─────────────────────────────────────────────────────────────

export function buildScopeContext(project: Project, ragContext: AssistantRAGContext): string {
  const lines: string[] = [
    `Book: "${project.title}" by ${project.author_name ?? 'unknown'}`,
    `Translation: ${project.source_language} → ${project.target_language}`,
    project.genre ? `Genre: ${project.genre}` : null,
  ].filter(Boolean) as string[]

  if (ragContext.relevantChapters.length > 0) {
    const summaries = ragContext.relevantChapters
      .slice(0, 3)
      .map((c) => {
        const label = c.chapter_title ? `Ch.${c.chapter_number} "${c.chapter_title}"` : `Ch.${c.chapter_number}`
        return `${label}: ${c.summary}`
      })
      .join('\n')
    lines.push(`Chapter summaries:\n${summaries}`)
  }

  if (ragContext.characters.length > 0) {
    const charList = ragContext.characters
      .map((c) => {
        const tags = c.tone_tags.length > 0 ? ` [${c.tone_tags.join(', ')}]` : ''
        return `${c.name} (${c.role})${tags}`
      })
      .join(', ')
    lines.push(`Characters: ${charList}`)
  }

  if (ragContext.approvedGlossary.length > 0) {
    const terms = ragContext.approvedGlossary.map((t) => t.source_term).join(', ')
    lines.push(`Key terms: ${terms}`)
  }

  return lines.join('\n')
}

export const SCOPE_CHECK_SYSTEM_PROMPT = `You are a scope filter for a literary translation assistant. Decide if a user's question is within scope for the translation project.

SCOPE IS BROAD — allow anything that could plausibly help a translator working on this specific book:
- Translation craft: word choices, register, tone, voice, rhythm, literary devices
- The book's world: plot, characters, themes, settings, historical period, cultural context
- The source culture: history, customs, social norms, religion, cuisine, geography, language quirks
- The target culture: how concepts map, what equivalents exist, what would resonate
- The author's style, influences, or literary tradition
- Any factual research a translator would reasonably need (historical institutions, dialect terms, social customs, religious practices, geography)
- General translation theory and practice

BLOCK ONLY when the question is completely unrelated to the book, its world, its cultures, or translation work. Examples to block:
- Sports celebrities or current sports scores unrelated to the book
- Celebrity gossip or entertainment news unrelated to the book's era/culture
- Financial advice, medical diagnosis, legal advice
- Coding help, tech support
- Questions about totally unrelated books, topics, or public figures

When in doubt: ALLOW. Be generous — the translator deserves a broad research assistant.

Respond ONLY with valid JSON: {"inScope": true|false, "blockMessage": null|"string"}.
blockMessage is only set when inScope is false — a warm, 1-2 sentence message that names the book and suggests what kinds of questions ARE welcome.`

export function buildScopeCheckUserPrompt(scopeContext: string, userMessage: string): string {
  return `Project context:\n${scopeContext}\n\nUser's question:\n"${userMessage}"\n\nIs this within scope?`
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
