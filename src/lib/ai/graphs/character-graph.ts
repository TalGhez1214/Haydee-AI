import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CharacterRow, Json } from '@/types/database'
import { llm } from '@/lib/anthropic/client'
import { logAiCall } from '@/lib/ai/utils/cost'
import { CHARACTER_SYSTEM_PROMPT, buildCharacterUserPrompt } from '@/lib/ai/prompts/character-prompts'

// ---- Zod schema ----

const CharacterProfileSchema = z.object({
  character: z.string(),
  tone_suggestions: z
    .array(
      z.object({
        tag: z.string(),
        evidence: z.string(),
      })
    )
    .length(3),
})

type CharacterProfile = z.infer<typeof CharacterProfileSchema>

// ---- State ----

const CharacterStateAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  characterId: Annotation<string>(),
  character: Annotation<CharacterRow | null>({ reducer: (_, b) => b }),
  passages: Annotation<string[]>({ reducer: (_, b) => b }),
  skipped: Annotation<boolean>({ reducer: (_, b) => b }),
  toneProfile: Annotation<CharacterProfile | null>({ reducer: (_, b) => b }),
  inputTokens: Annotation<number>({ reducer: (_, b) => b }),
  outputTokens: Annotation<number>({ reducer: (_, b) => b }),
})

type CharacterState = typeof CharacterStateAnnotation.State

// ---- Nodes ----

function makeLoadCharacterNode(supabase: SupabaseClient<Database>) {
  return async (state: CharacterState) => {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('id', state.characterId)
      .single()
    return { character: data }
  }
}

function makeFetchPassagesNode(supabase: SupabaseClient<Database>) {
  return async (state: CharacterState) => {
    if (!state.character) return { passages: [] }

    // chunks are linked to manuscripts, not projects directly — join via manuscripts
    const { data: manuscripts } = await supabase
      .from('manuscripts')
      .select('id')
      .eq('project_id', state.projectId)

    const manuscriptIds = (manuscripts ?? []).map((m) => m.id)
    if (manuscriptIds.length === 0) return { passages: [] }

    const { data: chunks } = await supabase
      .from('chunks')
      .select('text')
      .in('manuscript_id', manuscriptIds)
      .contains('character_mentions', [state.character.name])

    if (!chunks || chunks.length === 0) return { passages: [] }

    // Extract sentences mentioning the character from each chunk
    const namePattern = new RegExp(
      [state.character.name, ...state.character.name_variants]
        .filter(Boolean)
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'gi'
    )

    const passages: string[] = []
    for (const chunk of chunks) {
      const sentences = chunk.text.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        if (namePattern.test(sentence)) {
          passages.push(sentence.trim())
        }
      }
    }

    return { passages }
  }
}

function checkThreshold(state: CharacterState): string {
  return state.passages.length < 5 ? 'skip' : 'generate'
}

const structuredLlm = llm.withStructuredOutput(CharacterProfileSchema)

function makeGenerateProfileNode() {
  return async (state: CharacterState) => {
    if (!state.character) return { skipped: true }

    const messages = [
      new SystemMessage(CHARACTER_SYSTEM_PROMPT),
      new HumanMessage(buildCharacterUserPrompt(state.character, state.passages)),
    ]

    const profile = await structuredLlm.invoke(messages)

    const inputTokens = Math.ceil(JSON.stringify(messages).length / 4)
    const outputTokens = Math.ceil(JSON.stringify(profile).length / 4)

    return { toneProfile: profile, inputTokens, outputTokens, skipped: false }
  }
}

function makeSaveProfileNode(supabase: SupabaseClient<Database>) {
  return async (state: CharacterState) => {
    if (!state.toneProfile || !state.character) return {}

    const toneTags = state.toneProfile.tone_suggestions.map((t) => t.tag)

    // 1. Save tone_tags to characters table for quick access
    const { error: charError } = await supabase
      .from('characters')
      .update({ tone_tags: toneTags })
      .eq('id', state.characterId)
    if (charError) console.error('[character] save tone_tags failed:', charError.message)

    // 2. Update project_memory.characters with the full tone_suggestions (including evidence)
    const { data: memRow, error: memFetchError } = await supabase
      .from('project_memory')
      .select('characters')
      .eq('project_id', state.projectId)
      .single()
    if (memFetchError) {
      console.error('[character] fetch project_memory failed:', memFetchError.message)
      return {}
    }

    const existing = (memRow?.characters ?? []) as Array<Record<string, unknown>>
    const characterName = state.character.name.toLowerCase()
    const updated = existing.map((c) =>
      String(c.name).toLowerCase() === characterName
        ? { ...c, tone_tags: toneTags, tone_suggestions: state.toneProfile!.tone_suggestions }
        : c
    )

    const { error: memUpdateError } = await supabase
      .from('project_memory')
      .update({ characters: updated as unknown as Json, last_updated: new Date().toISOString() })
      .eq('project_id', state.projectId)
    if (memUpdateError) console.error('[character] update project_memory failed:', memUpdateError.message)
    else console.log('[character] save_profile ok for:', state.character.name)

    return {}
  }
}

function makeLogCostNode(supabase: SupabaseClient<Database>) {
  return async (state: CharacterState) => {
    if (state.skipped) return {}
    await logAiCall({
      supabase,
      projectId: state.projectId,
      userId: state.userId,
      jobType: 'character_profile',
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
    })
    return {}
  }
}

// ---- Graph builder ----

export function buildCharacterGraph(supabase: SupabaseClient<Database>) {
  const workflow = new StateGraph(CharacterStateAnnotation)
    .addNode('load_character', makeLoadCharacterNode(supabase))
    .addNode('fetch_passages', makeFetchPassagesNode(supabase))
    .addNode('generate_profile', makeGenerateProfileNode())
    .addNode('save_profile', makeSaveProfileNode(supabase))
    .addNode('log_cost', makeLogCostNode(supabase))
    .addEdge(START, 'load_character')
    .addEdge('load_character', 'fetch_passages')
    .addConditionalEdges('fetch_passages', checkThreshold, {
      skip: 'log_cost',
      generate: 'generate_profile',
    })
    .addEdge('generate_profile', 'save_profile')
    .addEdge('save_profile', 'log_cost')
    .addEdge('log_cost', END)

  return workflow.compile()
}
