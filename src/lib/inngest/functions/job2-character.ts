import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { buildCharacterGraph } from '@/lib/ai/graphs/character-graph'

export const job2Character = inngest.createFunction(
  { id: 'job-2-character-profile', retries: 2, triggers: [{ event: 'character/refresh-profile' }] },
  async ({ event, step }) => {
    const { characterId, projectId, userId } = event.data as {
      characterId: string
      projectId: string
      userId: string
    }

    await step.run('run-character-graph', async () => {
      const supabase = createServiceClient()
      const graph = buildCharacterGraph(supabase)
      await graph.invoke({
        characterId,
        projectId,
        userId,
        skipped: false,
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    return { success: true, characterId }
  }
)
