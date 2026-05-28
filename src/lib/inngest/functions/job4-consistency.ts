import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { buildConsistencyGraph } from '@/lib/ai/graphs/consistency-graph'

export const job4Consistency = inngest.createFunction(
  { id: 'job-4-consistency-check', retries: 2, triggers: [{ event: 'chapter/consistency-check' }] },
  async ({ event, step }) => {
    const { chunkId, projectId, userId, translationText } = event.data as {
      chunkId: string
      projectId: string
      userId: string
      translationText: string
    }

    await step.run('run-consistency-graph', async () => {
      const supabase = createServiceClient()
      const graph = buildConsistencyGraph(supabase)
      await graph.invoke({
        chunkId,
        projectId,
        userId,
        translationText,
        approvedCharacters: [],
        approvedGlossary: [],
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    return { success: true, chunkId }
  }
)
