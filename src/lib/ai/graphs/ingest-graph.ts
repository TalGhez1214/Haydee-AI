import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ProjectRow, ChunkRow, Json } from '@/types/database'
import { llm } from '@/lib/anthropic/client'
import { logAiCall } from '@/lib/ai/utils/cost'
import { INGEST_SYSTEM_PROMPT, buildIngestUserPrompt } from '@/lib/ai/prompts/ingest-prompts'
import { generateAutoTasks } from '@/lib/ai/utils/auto-tasks'

// ---- Zod schema for LLM output ----

const SuggestionSchema = z.object({
  approach: z.string(),
  text: z.string(),
})

const ChapterAnalysisSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      name_variants: z.array(z.string()).optional(),
      role: z.enum(['protagonist', 'narrator', 'secondary', 'minor']).optional(),
      first_appearance_quote: z.string().optional(),
    })
  ).optional(),
  glossary_candidates: z.array(
    z.object({
      source_term: z.string(),
      term_type: z.string().optional(),
      context: z.string().optional(),
      frequency: z.number().optional(),
    })
  ).optional(),
  culture_flags: z.array(
    z.object({
      passage: z.string(),
      paragraph_index: z.number().optional(),
      flag_type: z.string().optional(),
      severity: z.enum(['high', 'medium', 'low']).optional(),
      explanation: z.string(),
      suggestions: z.array(SuggestionSchema).optional(),
    })
  ).optional(),
  untranslatable_passages: z.array(
    z.object({
      passage: z.string(),
      paragraph_index: z.number().optional(),
      type: z.string().optional(),
      explanation: z.string(),
      strategies: z.array(z.string()).optional(),
    })
  ).optional(),
  chapter_summary: z.string().optional(),
})

type ChapterAnalysis = z.infer<typeof ChapterAnalysisSchema>

// ---- State ----

const IngestStateAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  manuscriptId: Annotation<string>(),
  project: Annotation<Pick<ProjectRow, 'title' | 'author_name' | 'source_language' | 'target_language' | 'genre' | 'style_guide'> | null>({
    reducer: (_, b) => b,
  }),
  chunks: Annotation<ChunkRow[]>({ reducer: (_, b) => b }),
  chapterAnalyses: Annotation<ChapterAnalysis[]>({ reducer: (_, b) => b }),
  totalInputTokens: Annotation<number>({ reducer: (a, b) => a + b }),
  totalOutputTokens: Annotation<number>({ reducer: (a, b) => a + b }),
})

type IngestState = typeof IngestStateAnnotation.State

// ---- Nodes ----

function makeLoadProjectNode(supabase: SupabaseClient<Database>) {
  return async (state: IngestState) => {
    const { data, error } = await supabase
      .from('projects')
      .select('title, author_name, source_language, target_language, genre, style_guide')
      .eq('id', state.projectId)
      .single()
    if (error) console.error('[ingest] load_project failed:', error.message, '| projectId:', state.projectId)
    else console.log('[ingest] load_project ok:', data?.title)
    return { project: data }
  }
}

function makeLoadChunksNode(supabase: SupabaseClient<Database>) {
  return async (state: IngestState) => {
    const { data, error } = await supabase
      .from('chunks')
      .select('*')
      .eq('manuscript_id', state.manuscriptId)
      .order('chapter_number', { ascending: true })
    if (error) console.error('[ingest] load_chunks failed:', error.message)
    else console.log('[ingest] load_chunks ok: found', data?.length ?? 0, 'chunks')
    return { chunks: data ?? [] }
  }
}

const structuredLlm = llm.withStructuredOutput(ChapterAnalysisSchema)

function makeAnalyzeChunksNode() {
  return async (state: IngestState) => {
    if (!state.project || state.chunks.length === 0) {
      console.warn('[ingest] analyze_chunks skipped — project:', !!state.project, '| chunks:', state.chunks.length)
      return { chapterAnalyses: [], totalInputTokens: 0, totalOutputTokens: 0 }
    }

    const analyses: ChapterAnalysis[] = []
    let totalInput = 0
    let totalOutput = 0

    for (const chunk of state.chunks) {
      const messages = [
        new SystemMessage(INGEST_SYSTEM_PROMPT),
        new HumanMessage(
          buildIngestUserPrompt(state.project, chunk.chapter_number, chunk.text)
        ),
      ]

      const response = await structuredLlm.invoke(messages)
      analyses.push(response)

      // Extract token usage from the raw LLM call for logging
      // Note: withStructuredOutput wraps the call; usage is tracked via llm.invoke separately
      // We approximate here; exact tracking requires using the base llm.invoke with response_metadata
      totalInput += Math.ceil(JSON.stringify(messages).length / 4)
      totalOutput += Math.ceil(JSON.stringify(response).length / 4)
    }

    return { chapterAnalyses: analyses, totalInputTokens: totalInput, totalOutputTokens: totalOutput }
  }
}

function makeMergeAndSaveNode(supabase: SupabaseClient<Database>) {
  return async (state: IngestState) => {
    const analyses = state.chapterAnalyses
    const chunks = state.chunks

    // Merge characters — deduplicate by name (case-insensitive)
    const characterMap = new Map<string, {
      name: string
      name_variants: string[]
      role: 'protagonist' | 'narrator' | 'secondary' | 'minor'
    }>()

    for (const analysis of analyses) {
      for (const char of analysis.characters ?? []) {
        const key = char.name.toLowerCase()
        const variants = char.name_variants ?? []
        const role = char.role ?? 'secondary'
        if (characterMap.has(key)) {
          const existing = characterMap.get(key)!
          const merged = new Set([...existing.name_variants, ...variants])
          characterMap.set(key, { ...existing, name_variants: Array.from(merged) })
        } else {
          characterMap.set(key, { name: char.name, name_variants: variants, role })
        }
      }
    }

    // Save characters
    if (characterMap.size > 0) {
      const characterInserts = Array.from(characterMap.values()).map((c) => ({
        project_id: state.projectId,
        name: c.name,
        name_variants: c.name_variants,
        role: c.role,
        confirmed: false,
      }))

      const { error: charError } = await supabase.from('characters').upsert(characterInserts, {
        onConflict: 'project_id,name',
        ignoreDuplicates: false,
      })
      if (charError) console.error('[ingest] save_characters failed:', charError.message)
      else console.log('[ingest] save_characters ok:', characterInserts.length, 'rows')
    }

    // Merge glossary candidates — deduplicate by source_term
    const glossaryMap = new Map<string, { source_term: string; term_type: string; ai_suggestion: string; frequency: number }>()
    for (const analysis of analyses) {
      for (const term of analysis.glossary_candidates ?? []) {
        const key = term.source_term.toLowerCase()
        if (glossaryMap.has(key)) {
          glossaryMap.get(key)!.frequency += term.frequency ?? 1
        } else {
          glossaryMap.set(key, {
            source_term: term.source_term,
            term_type: term.term_type ?? 'other',
            ai_suggestion: term.context ?? '',
            frequency: term.frequency ?? 1,
          })
        }
      }
    }

    if (glossaryMap.size > 0) {
      const glossaryInserts = Array.from(glossaryMap.values()).map((g) => ({
        project_id: state.projectId,
        source_term: g.source_term,
        term_type: g.term_type,
        ai_suggestion: g.ai_suggestion,
        status: 'pending' as const,
        frequency: g.frequency,
      }))

      const { error: glossaryError } = await supabase.from('glossary_terms').upsert(glossaryInserts, {
        onConflict: 'project_id,source_term',
        ignoreDuplicates: false,
      })
      if (glossaryError) console.error('[ingest] save_glossary failed:', glossaryError.message)
      else console.log('[ingest] save_glossary ok:', glossaryInserts.length, 'rows')
    }

    // Save culture flags and untranslatable passages to flags table
    const flagInserts: Array<{
      project_id: string
      chunk_id: string | null
      flag_type: 'culture' | 'untranslatable'
      severity: 'high' | 'medium' | 'low'
      passage: string
      explanation: string
      suggestions: Json
      status: 'open'
    }> = []

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i]
      const chunk = chunks[i]

      for (const flag of analysis.culture_flags ?? []) {
        flagInserts.push({
          project_id: state.projectId,
          chunk_id: chunk?.id ?? null,
          flag_type: 'culture',
          severity: flag.severity ?? 'medium',
          passage: flag.passage,
          explanation: flag.explanation,
          suggestions: (flag.suggestions ?? []) as Json,
          status: 'open',
        })
      }

      for (const passage of analysis.untranslatable_passages ?? []) {
        flagInserts.push({
          project_id: state.projectId,
          chunk_id: chunk?.id ?? null,
          flag_type: 'untranslatable',
          severity: 'high',
          passage: passage.passage,
          explanation: passage.explanation,
          suggestions: (passage.strategies ?? []) as Json,
          status: 'open',
        })
      }
    }

    if (flagInserts.length > 0) {
      const { error: flagsError } = await supabase.from('flags').insert(flagInserts)
      if (flagsError) console.error('[ingest] save_flags failed:', flagsError.message)
      else console.log('[ingest] save_flags ok:', flagInserts.length, 'rows')
    }

    // Update character_mentions on each chunk so Job 2 can query passages by character name
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i]
      const chunk = chunks[i]
      if (!chunk) continue
      const mentionedNames = (analysis.characters ?? []).map((c) => c.name)
      if (mentionedNames.length > 0) {
        const { error } = await supabase
          .from('chunks')
          .update({ character_mentions: mentionedNames })
          .eq('id', chunk.id)
        if (error) console.error('[ingest] update character_mentions failed for chunk', chunk.id, ':', error.message)
      }
    }

    // Build project memory from merged results
    const allCharacters = Array.from(characterMap.values()).map((c) => ({
      name: c.name,
      variants: c.name_variants,
      role: c.role,
      confirmed_target_name: null,
      tone_tags: [],
      translator_note: null,
    }))

    const allGlossary = Array.from(glossaryMap.values()).map((g) => ({
      source_term: g.source_term,
      approved_translation: null,
      ai_suggestion: g.ai_suggestion,
    }))

    const { error: memoryError } = await supabase.from('project_memory').upsert(
      {
        project_id: state.projectId,
        characters: allCharacters,
        glossary: allGlossary,
        open_culture_flags: flagInserts.filter((f) => f.flag_type === 'culture').length,
        resolved_culture_flags: 0,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    )
    if (memoryError) console.error('[ingest] save_project_memory failed:', memoryError.message)
    else console.log('[ingest] save_project_memory ok')

    // Generate auto tasks based on analysis results
    await generateAutoTasks(
      supabase,
      state.projectId,
      flagInserts,
      chunks,
      characterMap.size,
      glossaryMap.size
    )

    return {}
  }
}

function makeLogCostNode(supabase: SupabaseClient<Database>) {
  return async (state: IngestState) => {
    await logAiCall({
      supabase,
      projectId: state.projectId,
      userId: state.userId,
      jobType: 'ingestion',
      inputTokens: state.totalInputTokens,
      outputTokens: state.totalOutputTokens,
    })
    return {}
  }
}

// ---- Graph builder ----

export function buildIngestGraph(supabase: SupabaseClient<Database>) {
  const workflow = new StateGraph(IngestStateAnnotation)
    .addNode('load_project', makeLoadProjectNode(supabase))
    .addNode('load_chunks', makeLoadChunksNode(supabase))
    .addNode('analyze_chunks', makeAnalyzeChunksNode())
    .addNode('merge_and_save', makeMergeAndSaveNode(supabase))
    .addNode('log_cost', makeLogCostNode(supabase))
    .addEdge(START, 'load_project')
    .addEdge('load_project', 'load_chunks')
    .addEdge('load_chunks', 'analyze_chunks')
    .addEdge('analyze_chunks', 'merge_and_save')
    .addEdge('merge_and_save', 'log_cost')
    .addEdge('log_cost', END)

  return workflow.compile()
}
