import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ChunkRow } from '@/types/database'

interface FlagInsert {
  project_id: string
  chunk_id: string | null
  flag_type: 'culture' | 'untranslatable'
  severity: 'high' | 'medium' | 'low'
}

export async function generateAutoTasks(
  supabase: SupabaseClient<Database>,
  projectId: string,
  flagInserts: FlagInsert[],
  chunks: ChunkRow[],
  characterCount: number,
  glossaryPendingCount: number
): Promise<void> {
  // Clear any existing auto-generated tasks so re-uploading gives fresh ones
  const { error: deleteError } = await supabase
    .from('project_todos')
    .delete()
    .eq('project_id', projectId)
    .eq('auto_generated', true)

  if (deleteError) {
    console.error('[auto-tasks] failed to clear old tasks:', deleteError.message)
    return
  }

  const chunkMap = new Map(chunks.map((c) => [c.id, c.chapter_number]))
  const tasksToInsert: Array<{
    project_id: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    status: 'open'
    auto_generated: true
    linked_type: 'flag' | 'none'
  }> = []

  // Group high-severity culture flags by chunk
  const highCultureByChunk = new Map<string | null, number>()
  for (const flag of flagInserts) {
    if (flag.flag_type === 'culture' && flag.severity === 'high') {
      const key = flag.chunk_id ?? null
      highCultureByChunk.set(key, (highCultureByChunk.get(key) ?? 0) + 1)
    }
  }

  for (const [chunkId, count] of Array.from(highCultureByChunk.entries())) {
    const chapterNumber = chunkId ? chunkMap.get(chunkId) : null
    const chapterLabel = chapterNumber ? `chapter ${chapterNumber}` : 'the manuscript'
    tasksToInsert.push({
      project_id: projectId,
      title: `Resolve ${count} high-severity culture flag${count > 1 ? 's' : ''} in ${chapterLabel}`,
      description: `${count} high-severity culture flag${count > 1 ? 's were' : ' was'} found in ${chapterLabel} during ingestion.`,
      priority: 'high',
      status: 'open',
      auto_generated: true,
      linked_type: 'flag',
    })
  }

  // Untranslatable passages total
  const untranslatableCount = flagInserts.filter((f) => f.flag_type === 'untranslatable').length
  if (untranslatableCount > 0) {
    tasksToInsert.push({
      project_id: projectId,
      title: `Review ${untranslatableCount} untranslatable passage${untranslatableCount > 1 ? 's' : ''} flagged during ingestion`,
      description:
        'These passages require special translation strategies — wordplay, dialect, or form-dependent content.',
      priority: 'medium',
      status: 'open',
      auto_generated: true,
      linked_type: 'flag',
    })
  }

  // Unconfirmed characters
  if (characterCount >= 3) {
    tasksToInsert.push({
      project_id: projectId,
      title: `Confirm target-language names for ${characterCount} detected character${characterCount > 1 ? 's' : ''}`,
      description: 'Review AI-detected characters and confirm or adjust their target-language names.',
      priority: 'medium',
      status: 'open',
      auto_generated: true,
      linked_type: 'none',
    })
  }

  // Pending glossary terms
  if (glossaryPendingCount >= 5) {
    tasksToInsert.push({
      project_id: projectId,
      title: `Review ${glossaryPendingCount} pending glossary candidate${glossaryPendingCount > 1 ? 's' : ''}`,
      description: 'Approve, flag, or adjust AI-suggested translations for extracted terminology.',
      priority: 'low',
      status: 'open',
      auto_generated: true,
      linked_type: 'none',
    })
  }

  if (tasksToInsert.length === 0) return

  const { error: insertError } = await supabase.from('project_todos').insert(tasksToInsert)
  if (insertError) {
    console.error('[auto-tasks] insert failed:', insertError.message)
  } else {
    console.log('[auto-tasks] generated', tasksToInsert.length, 'tasks for project', projectId)
  }
}
