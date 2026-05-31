export const SUGGESTED_PROMPTS: Record<string, string[]> = {
  'culture-queue': [
    'Explain the cultural significance of the hardest flag',
    'What translation approaches work best for untranslatable idioms?',
    'Summarize my open culture flags',
  ],
  characters: [
    'Which characters are still unconfirmed?',
    'How should I handle honorifics for character names?',
    'Tips for maintaining voice consistency across characters',
  ],
  glossary: [
    'What are the pending glossary terms I need to review?',
    'How do I decide between transliteration and translation for proper nouns?',
    'Best practices for handling culture-specific concepts in glossary',
  ],
  manuscript: [
    'Run a consistency check on this chapter',
    'Scan this chapter for untranslatable passages',
    'What cultural issues should I watch for in this chapter?',
  ],
  'author-qa': [
    "Summarize my unanswered author questions",
    'How do I write a clear question for the author about an ambiguous passage?',
    'Which questions have been pending the longest?',
  ],
  'todo-list': [
    "What are my highest priority open tasks?",
    'What should I work on first today?',
    'Are there any auto-generated tasks from the last manuscript analysis?',
  ],
  research: [
    'Help me research the cultural context of this work',
    'What should a translator\'s preface for this genre include?',
    'Find background information on the historical period in this book',
  ],
  default: [
    "What's my overall project status?",
    'What are the most urgent things to address?',
    'Research tips for literary translation',
  ],
}

export function getSuggestedPrompts(page: string): string[] {
  return SUGGESTED_PROMPTS[page] ?? SUGGESTED_PROMPTS.default
}
