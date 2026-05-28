import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { buildUntranslatableGraph } from '@/lib/ai/graphs/untranslatable-graph'

export const job5Untranslatable = inngest.createFunction(
  { id: 'job-5-untranslatable', retries: 2, triggers: [{ event: 'chapter/untranslatable-scan' }] },
  async ({ event, step }) => {
    const { chunkId, projectId, userId } = event.data as {
      chunkId: string
      projectId: string
      userId: string
    }

    await step.run('run-untranslatable-graph', async () => {
      const supabase = createServiceClient()
      const graph = buildUntranslatableGraph(supabase)
      await graph.invoke({
        chunkId,
        projectId,
        userId,
        sourceLanguage: '',
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    return { success: true, chunkId }
  }
)
