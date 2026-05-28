import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { buildTranslateGraph } from '@/lib/ai/graphs/translate-graph'

export const job6Translate = inngest.createFunction(
  { id: 'job-6-translate', retries: 2, triggers: [{ event: 'translation/suggest' }] },
  async ({ event, step }) => {
    const { requestId, projectId, userId } = event.data as {
      requestId: string
      projectId: string
      userId: string
    }

    await step.run('run-translate-graph', async () => {
      const supabase = createServiceClient()
      const graph = buildTranslateGraph(supabase)
      await graph.invoke({
        requestId,
        projectId,
        userId,
        selectedText: '',
        project: null,
        glossaryTerms: [],
        characters: [],
        result: null,
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    return { success: true, requestId }
  }
)
