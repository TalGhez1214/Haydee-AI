import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { buildCultureGraph } from '@/lib/ai/graphs/culture-graph'

export const job3Culture = inngest.createFunction(
  { id: 'job-3-culture-flags', retries: 2, triggers: [{ event: 'chapter/culture-flags' }] },
  async ({ event, step }) => {
    const { chunkId, projectId, userId } = event.data as {
      chunkId: string
      projectId: string
      userId: string
    }

    await step.run('run-culture-graph', async () => {
      const supabase = createServiceClient()
      const graph = buildCultureGraph(supabase)
      await graph.invoke({
        chunkId,
        projectId,
        userId,
        sourceLanguage: '',
        targetLanguage: '',
        genre: null,
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    return { success: true, chunkId }
  }
)
