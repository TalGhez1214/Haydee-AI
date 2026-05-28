import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { llm } from '@/lib/anthropic/client'
import { logAiCall } from '@/lib/ai/utils/cost'
import { buildProjectMemory, trimMemoryForJob } from '@/lib/ai/utils/memory'
import { CONSISTENCY_SYSTEM_PROMPT, buildConsistencyUserPrompt } from '@/lib/ai/prompts/consistency-prompts'

// ---- Zod schema ----

const ConsistencyFlagsSchema = z.object({
  consistency_flags: z.array(
    z.object({
      type: z.enum(['name_inconsistency', 'term_deviation']),
      source_text: z.string(),
      translated_text: z.string(),
      approved_translation: z.string(),
      suggestion: z.string(),
      paragraph_index: z.number().default(1),
    })
  ),
})

type ConsistencyFlag = z.infer<typeof ConsistencyFlagsSchema>['consistency_flags'][number]

// ---- State ----

const ConsistencyStateAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  chunkId: Annotation<string>(),
  translationText: Annotation<string>(),
  approvedCharacters: Annotation<Array<{ name: string; confirmed_target_name: string | null; variants: string[] }>>({
    reducer: (_, b) => b,
  }),
  approvedGlossary: Annotation<Array<{ source_term: string; approved_translation: string | null }>>({
    reducer: (_, b) => b,
  }),
  flags: Annotation<ConsistencyFlag[]>({ reducer: (_, b) => b }),
  inputTokens: Annotation<number>({ reducer: (_, b) => b }),
  outputTokens: Annotation<number>({ reducer: (_, b) => b }),
})

type ConsistencyState = typeof ConsistencyStateAnnotation.State

// ---- Nodes ----

function makeLoadMemoryNode(supabase: SupabaseClient<Database>) {
  return async (state: ConsistencyState) => {
    const memory = await buildProjectMemory(supabase, state.projectId)
    const trimmed = trimMemoryForJob(memory, 'consistency')

    return {
      approvedCharacters: (trimmed.characters ?? []).map((c) => ({
        name: c.name,
        confirmed_target_name: c.confirmed_target_name,
        variants: c.variants,
      })),
      approvedGlossary: (trimmed.glossary ?? []).map((g) => ({
        source_term: g.source_term,
        approved_translation: g.approved_translation,
      })),
    }
  }
}

const structuredLlm = llm.withStructuredOutput(ConsistencyFlagsSchema)

function makeCheckConsistencyNode() {
  return async (state: ConsistencyState) => {
    const messages = [
      new SystemMessage(CONSISTENCY_SYSTEM_PROMPT),
      new HumanMessage(
        buildConsistencyUserPrompt(
          state.approvedCharacters,
          state.approvedGlossary,
          state.translationText
        )
      ),
    ]

    const result = await structuredLlm.invoke(messages)
    const inputTokens = Math.ceil(JSON.stringify(messages).length / 4)
    const outputTokens = Math.ceil(JSON.stringify(result).length / 4)

    return { flags: result.consistency_flags, inputTokens, outputTokens }
  }
}

function makeSaveFlagsNode(supabase: SupabaseClient<Database>) {
  return async (state: ConsistencyState) => {
    if (state.flags.length === 0) return {}

    await supabase.from('flags').insert(
      state.flags.map((flag) => ({
        project_id: state.projectId,
        chunk_id: state.chunkId,
        flag_type: 'consistency' as const,
        severity: 'medium' as const,
        passage: flag.source_text,
        source_text: flag.source_text,
        explanation: flag.suggestion,
        suggestions: [{ translated: flag.translated_text, approved: flag.approved_translation }],
        status: 'open' as const,
      }))
    )
    return {}
  }
}

function makeLogCostNode(supabase: SupabaseClient<Database>) {
  return async (state: ConsistencyState) => {
    if (state.inputTokens === 0) return {}
    await logAiCall({
      supabase,
      projectId: state.projectId,
      userId: state.userId,
      jobType: 'consistency_check',
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
    })
    return {}
  }
}

// ---- Graph builder ----

export function buildConsistencyGraph(supabase: SupabaseClient<Database>) {
  const workflow = new StateGraph(ConsistencyStateAnnotation)
    .addNode('load_memory', makeLoadMemoryNode(supabase))
    .addNode('check_consistency', makeCheckConsistencyNode())
    .addNode('save_flags', makeSaveFlagsNode(supabase))
    .addNode('log_cost', makeLogCostNode(supabase))
    .addEdge(START, 'load_memory')
    .addEdge('load_memory', 'check_consistency')
    .addEdge('check_consistency', 'save_flags')
    .addEdge('save_flags', 'log_cost')
    .addEdge('log_cost', END)

  return workflow.compile()
}
