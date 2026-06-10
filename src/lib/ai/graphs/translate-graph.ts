import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ProjectRow, GlossaryTermRow, CharacterRow } from '@/types/database'
import { llm } from '@/lib/anthropic/client'
import { logAiCall } from '@/lib/ai/utils/cost'
import { TRANSLATE_SYSTEM_PROMPT, buildTranslateUserPrompt } from '@/lib/ai/prompts/translate-prompts'
import { retrieveChapterContext, type ChapterContext } from '@/lib/ai/rag/retrieve'

// ---- State ----

const TranslateStateAnnotation = Annotation.Root({
  requestId: Annotation<string>(),
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  chunkId: Annotation<string | null>({ reducer: (_, b) => b }),
  selectedText: Annotation<string>({ reducer: (_, b) => b }),
  project: Annotation<ProjectRow | null>({ reducer: (_, b) => b }),
  glossaryTerms: Annotation<GlossaryTermRow[]>({ reducer: (_, b) => b }),
  characters: Annotation<CharacterRow[]>({ reducer: (_, b) => b }),
  chapterContext: Annotation<ChapterContext[]>({ reducer: (_, b) => b }),
  result: Annotation<string | null>({ reducer: (_, b) => b }),
  inputTokens: Annotation<number>({ reducer: (_, b) => b }),
  outputTokens: Annotation<number>({ reducer: (_, b) => b }),
})

type TranslateState = typeof TranslateStateAnnotation.State

// ---- Nodes ----

function makeLoadRequestNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    const { data } = await supabase
      .from('translation_requests')
      .select('selected_text')
      .eq('id', state.requestId)
      .single()
    return { selectedText: data?.selected_text ?? '' }
  }
}

function makeLoadProjectNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', state.projectId)
      .single()
    return { project: data }
  }
}

function makeLoadGlossaryNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    if (!state.selectedText) return { glossaryTerms: [] as GlossaryTermRow[] }
    const { data: terms } = await supabase
      .from('glossary_terms')
      .select('*')
      .eq('project_id', state.projectId)
      .eq('status', 'approved')
    const lower = state.selectedText.toLowerCase()
    const relevant = (terms ?? []).filter((t) =>
      lower.includes(t.source_term.toLowerCase())
    )
    return { glossaryTerms: relevant }
  }
}

function makeLoadCharactersNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    if (!state.selectedText) return { characters: [] as CharacterRow[] }
    const { data: chars } = await supabase
      .from('characters')
      .select('*')
      .eq('project_id', state.projectId)
    // Filter to characters whose name (or a variant) appears in the selected passage
    const relevant = (chars ?? []).filter(
      (c) =>
        state.selectedText.includes(c.name) ||
        c.name_variants.some((v) => state.selectedText.includes(v))
    )
    return { characters: relevant }
  }
}

function makeLoadChunkContextNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    if (!state.chunkId) return { chapterContext: [] as ChapterContext[] }

    // Get the chapter number for this chunk so we can fetch neighbour summaries
    const { data: chunk } = await supabase
      .from('chunks')
      .select('chapter_number')
      .eq('id', state.chunkId)
      .single()

    if (!chunk) return { chapterContext: [] as ChapterContext[] }

    const context = await retrieveChapterContext(supabase, state.projectId, chunk.chapter_number)
    return { chapterContext: context }
  }
}

function makeTranslateNode() {
  return async (state: TranslateState) => {
    if (!state.project || !state.selectedText) return { result: null }

    const messages = [
      new SystemMessage(TRANSLATE_SYSTEM_PROMPT),
      new HumanMessage(
        buildTranslateUserPrompt(
          state.project,
          state.selectedText,
          state.glossaryTerms,
          state.characters,
          state.chapterContext
        )
      ),
    ]

    const response = await llm.invoke(messages)
    const text =
      typeof response.content === 'string' ? response.content : String(response.content)

    const inputTokens = Math.ceil(JSON.stringify(messages).length / 4)
    const outputTokens = Math.ceil(text.length / 4)

    return { result: text.trim(), inputTokens, outputTokens }
  }
}

function makeSaveResultNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    await supabase
      .from('translation_requests')
      .update({ result: state.result, status: state.result ? 'done' : 'error' })
      .eq('id', state.requestId)
    return {}
  }
}

function makeLogCostNode(supabase: SupabaseClient<Database>) {
  return async (state: TranslateState) => {
    if (!state.result) return {}
    await logAiCall({
      supabase,
      projectId: state.projectId,
      userId: state.userId,
      jobType: 'translate',
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
    })
    return {}
  }
}

// ---- Graph ----

export function buildTranslateGraph(supabase: SupabaseClient<Database>) {
  const workflow = new StateGraph(TranslateStateAnnotation)
    .addNode('load_request', makeLoadRequestNode(supabase))
    .addNode('load_project', makeLoadProjectNode(supabase))
    .addNode('load_glossary', makeLoadGlossaryNode(supabase))
    .addNode('load_characters', makeLoadCharactersNode(supabase))
    .addNode('load_chunk_context', makeLoadChunkContextNode(supabase))
    .addNode('translate', makeTranslateNode())
    .addNode('save_result', makeSaveResultNode(supabase))
    .addNode('log_cost', makeLogCostNode(supabase))
    .addEdge(START, 'load_request')
    .addEdge('load_request', 'load_project')
    .addEdge('load_project', 'load_glossary')
    .addEdge('load_glossary', 'load_characters')
    .addEdge('load_characters', 'load_chunk_context')
    .addEdge('load_chunk_context', 'translate')
    .addEdge('translate', 'save_result')
    .addEdge('save_result', 'log_cost')
    .addEdge('log_cost', END)

  return workflow.compile()
}
