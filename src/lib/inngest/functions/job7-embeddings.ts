import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { generateEmbeddings } from '@/lib/ai/rag/embeddings'
import { logAiCall } from '@/lib/ai/utils/cost'

const BATCH_SIZE = 64

export const job7Embeddings = inngest.createFunction(
  { id: 'job-7-embeddings', retries: 2, triggers: [{ event: 'manuscript/ingested' }] },
  async ({ event, step }) => {
    const { manuscriptId, projectId, userId } = event.data as {
      manuscriptId: string
      projectId: string
      userId: string
    }

    // Load all chunks that need embeddings (may have no summary yet if Job 1 just ran)
    const chunks = await step.run('load-chunks', async () => {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('chunks')
        .select('id, summary, text')
        .eq('manuscript_id', manuscriptId)
        .order('chapter_number', { ascending: true })
      if (error) console.error('[job7] load_chunks failed:', error.message)
      return data ?? []
    })

    if (chunks.length === 0) return { success: true, embedded: 0 }

    // Generate and store embeddings in batches
    let totalTokens = 0
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchIndex = Math.floor(i / BATCH_SIZE)

      await step.run(`embed-batch-${batchIndex}`, async () => {
        const supabase = createServiceClient()
        // Embed summary if available, otherwise truncate full text to ~4000 chars
        const texts = batch.map((c) => c.summary ?? c.text.slice(0, 4000))
        // Approximate token count: ~1 token per 4 chars
        totalTokens += Math.ceil(texts.join('').length / 4)

        const embeddings = await generateEmbeddings(texts)

        for (let j = 0; j < batch.length; j++) {
          const embeddingStr = `[${embeddings[j].join(',')}]`
          const { error } = await supabase
            .from('chunks')
            // embedding column is vector(512) — Supabase accepts the pgvector text format
            .update({ embedding: embeddingStr as unknown as string })
            .eq('id', batch[j].id)
          if (error) console.error('[job7] update embedding failed for chunk', batch[j].id, ':', error.message)
        }
      })
    }

    await step.run('log-cost', async () => {
      const supabase = createServiceClient()
      await logAiCall({
        supabase,
        projectId,
        userId,
        jobType: 'embeddings',
        inputTokens: totalTokens,
        outputTokens: 0,
      })
    })

    return { success: true, embedded: chunks.length }
  }
)
