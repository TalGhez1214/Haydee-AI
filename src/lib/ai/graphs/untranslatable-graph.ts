import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ChunkRow } from '@/types/database'
import { llm } from '@/lib/anthropic/client'
import { logAiCall } from '@/lib/ai/utils/cost'
import { buildProjectMemory, trimMemoryForJob } from '@/lib/ai/utils/memory'
import {
  UNTRANSLATABLE_SYSTEM_PROMPT,
  buildUntranslatableUserPrompt,
} from '@/lib/ai/prompts/untranslatable-prompts'

// ---- Zod schema ----

const UntranslatableSchema = z.object({
  untranslatable_passages: z.array(
    z.object({
      passage: z.string(),
      chapter: z.number(),
      paragraph_index: z.number().default(1),
      type: z.string().default('other'),
      explanation: z.string(),
      strategies: z.array(z.string()).default([]),
    })
  ),
})

type UntranslatablePassage = z.infer<typeof UntranslatableSchema>['untranslatable_passages'][number]

// ---- State ----

const UntranslatableStateAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  chunkId: Annotation<string>(),
  chunk: Annotation<ChunkRow | null>({ reducer: (_, b) => b }),
  sourceLanguage: Annotation<string>({ reducer: (_, b) => b }),
  passages: Annotation<UntranslatablePassage[]>({ reducer: (_, b) => b }),
  inputTokens: Annotation<number>({ reducer: (_, b) => b }),
  outputTokens: Annotation<number>({ reducer: (_, b) => b }),
})

type UntranslatableState = typeof UntranslatableStateAnnotation.State

// ---- Nodes ----

function makeLoadChunkNode(supabase: SupabaseClient<Database>) {
  return async (state: UntranslatableState) => {
    const { data } = await supabase.from('chunks').select('*').eq('id', state.chunkId).single()
    return { chunk: data }
  }
}

function makeLoadMemoryNode(supabase: SupabaseClient<Database>) {
  return async (state: UntranslatableState) => {
    const memory = await buildProjectMemory(supabase, state.projectId)
    const trimmed = trimMemoryForJob(memory, 'untranslatable')
    return { sourceLanguage: trimmed.source_language ?? memory.source_language }
  }
}

const structuredLlm = llm.withStructuredOutput(UntranslatableSchema)

function makeDetectNode() {
  return async (state: UntranslatableState) => {
    if (!state.chunk) return { passages: [], inputTokens: 0, outputTokens: 0 }

    const messages = [
      new SystemMessage(UNTRANSLATABLE_SYSTEM_PROMPT),
      new HumanMessage(
        buildUntranslatableUserPrompt(state.sourceLanguage, state.chunk.chapter_number, state.chunk.text)
      ),
    ]

    const result = await structuredLlm.invoke(messages)
    const inputTokens = Math.ceil(JSON.stringify(messages).length / 4)
    const outputTokens = Math.ceil(JSON.stringify(result).length / 4)

    return { passages: result.untranslatable_passages, inputTokens, outputTokens }
  }
}

function makeSaveFlagsNode(supabase: SupabaseClient<Database>) {
  return async (state: UntranslatableState) => {
    if (state.passages.length === 0) return {}

    await supabase.from('flags').insert(
      state.passages.map((p) => ({
        project_id: state.projectId,
        chunk_id: state.chunkId,
        flag_type: 'untranslatable' as const,
        severity: 'high' as const,
        passage: p.passage,
        explanation: p.explanation,
        suggestions: p.strategies,
        status: 'open' as const,
      }))
    )
    return {}
  }
}

function makeLogCostNode(supabase: SupabaseClient<Database>) {
  return async (state: UntranslatableState) => {
    if (state.inputTokens === 0) return {}
    await logAiCall({
      supabase,
      projectId: state.projectId,
      userId: state.userId,
      jobType: 'untranslatable',
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
    })
    return {}
  }
}

// ---- Graph builder ----

export function buildUntranslatableGraph(supabase: SupabaseClient<Database>) {
  const workflow = new StateGraph(UntranslatableStateAnnotation)
    .addNode('load_chunk', makeLoadChunkNode(supabase))
    .addNode('load_memory', makeLoadMemoryNode(supabase))
    .addNode('detect', makeDetectNode())
    .addNode('save_flags', makeSaveFlagsNode(supabase))
    .addNode('log_cost', makeLogCostNode(supabase))
    .addEdge(START, 'load_chunk')
    .addEdge('load_chunk', 'load_memory')
    .addEdge('load_memory', 'detect')
    .addEdge('detect', 'save_flags')
    .addEdge('save_flags', 'log_cost')
    .addEdge('log_cost', END)

  return workflow.compile()
}
