import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ChunkRow } from '@/types/database'
import { llm } from '@/lib/anthropic/client'
import { logAiCall } from '@/lib/ai/utils/cost'
import { buildProjectMemory, trimMemoryForJob } from '@/lib/ai/utils/memory'
import { CULTURE_SYSTEM_PROMPT, buildCultureUserPrompt } from '@/lib/ai/prompts/culture-prompts'

// ---- Zod schema ----

const CultureFlagsSchema = z.object({
  flags: z.array(
    z.object({
      passage: z.string(),
      chapter: z.number(),
      paragraph_index: z.number().default(1),
      flag_type: z.string().default('other'),
      severity: z.enum(['high', 'medium', 'low']).default('medium'),
      explanation: z.string(),
      suggestions: z
        .array(z.object({ approach: z.string(), text: z.string() }))
        .default([]),
    })
  ),
})

type CultureFlagsResult = z.infer<typeof CultureFlagsSchema>

// ---- State ----

const CultureStateAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  chunkId: Annotation<string>(),
  chunk: Annotation<ChunkRow | null>({ reducer: (_, b) => b }),
  sourceLanguage: Annotation<string>({ reducer: (_, b) => b }),
  targetLanguage: Annotation<string>({ reducer: (_, b) => b }),
  genre: Annotation<string | null>({ reducer: (_, b) => b }),
  flags: Annotation<CultureFlagsResult['flags']>({ reducer: (_, b) => b }),
  inputTokens: Annotation<number>({ reducer: (_, b) => b }),
  outputTokens: Annotation<number>({ reducer: (_, b) => b }),
})

type CultureState = typeof CultureStateAnnotation.State

// ---- Nodes ----

function makeLoadChunkNode(supabase: SupabaseClient<Database>) {
  return async (state: CultureState) => {
    const { data } = await supabase.from('chunks').select('*').eq('id', state.chunkId).single()
    return { chunk: data }
  }
}

function makeLoadMemoryNode(supabase: SupabaseClient<Database>) {
  return async (state: CultureState) => {
    const memory = await buildProjectMemory(supabase, state.projectId)
    const trimmed = trimMemoryForJob(memory, 'culture')
    return {
      sourceLanguage: trimmed.source_language ?? memory.source_language,
      targetLanguage: trimmed.target_language ?? memory.target_language,
      genre: trimmed.genre ?? memory.genre ?? null,
    }
  }
}

const structuredLlm = llm.withStructuredOutput(CultureFlagsSchema)

function makeDetectFlagsNode() {
  return async (state: CultureState) => {
    if (!state.chunk) return { flags: [], inputTokens: 0, outputTokens: 0 }

    const messages = [
      new SystemMessage(CULTURE_SYSTEM_PROMPT),
      new HumanMessage(
        buildCultureUserPrompt(
          state.sourceLanguage,
          state.targetLanguage,
          state.genre,
          state.chunk.chapter_number,
          state.chunk.text
        )
      ),
    ]

    const result = await structuredLlm.invoke(messages)
    const inputTokens = Math.ceil(JSON.stringify(messages).length / 4)
    const outputTokens = Math.ceil(JSON.stringify(result).length / 4)

    return { flags: result.flags, inputTokens, outputTokens }
  }
}

function makeSaveFlagsNode(supabase: SupabaseClient<Database>) {
  return async (state: CultureState) => {
    if (state.flags.length === 0) return {}

    await supabase.from('flags').insert(
      state.flags.map((flag) => ({
        project_id: state.projectId,
        chunk_id: state.chunkId,
        flag_type: 'culture' as const,
        severity: flag.severity,
        passage: flag.passage,
        explanation: flag.explanation,
        suggestions: flag.suggestions,
        status: 'open' as const,
      }))
    )

    // Update open_culture_flags count in project_memory
    const { data: mem } = await supabase
      .from('project_memory')
      .select('open_culture_flags')
      .eq('project_id', state.projectId)
      .maybeSingle()

    const current = typeof mem?.open_culture_flags === 'number' ? mem.open_culture_flags : 0
    await supabase
      .from('project_memory')
      .update({ open_culture_flags: current + state.flags.length, last_updated: new Date().toISOString() })
      .eq('project_id', state.projectId)

    return {}
  }
}

function makeLogCostNode(supabase: SupabaseClient<Database>) {
  return async (state: CultureState) => {
    if (state.inputTokens === 0) return {}
    await logAiCall({
      supabase,
      projectId: state.projectId,
      userId: state.userId,
      jobType: 'culture_flags',
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
    })
    return {}
  }
}

// ---- Graph builder ----

export function buildCultureGraph(supabase: SupabaseClient<Database>) {
  const workflow = new StateGraph(CultureStateAnnotation)
    .addNode('load_chunk', makeLoadChunkNode(supabase))
    .addNode('load_memory', makeLoadMemoryNode(supabase))
    .addNode('detect_flags', makeDetectFlagsNode())
    .addNode('save_flags', makeSaveFlagsNode(supabase))
    .addNode('log_cost', makeLogCostNode(supabase))
    .addEdge(START, 'load_chunk')
    .addEdge('load_chunk', 'load_memory')
    .addEdge('load_memory', 'detect_flags')
    .addEdge('detect_flags', 'save_flags')
    .addEdge('save_flags', 'log_cost')
    .addEdge('log_cost', END)

  return workflow.compile()
}
