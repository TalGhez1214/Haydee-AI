import { inngest } from '@/lib/inngest/client'
import { createServiceClient } from '@/lib/supabase/service'
import { buildIngestGraph } from '@/lib/ai/graphs/ingest-graph'

export const job1Ingest = inngest.createFunction(
  { id: 'job-1-ingest', retries: 2, triggers: [{ event: 'manuscript/uploaded' }] },
  async ({ event, step }) => {
    const { manuscriptId, projectId, userId } = event.data as {
      manuscriptId: string
      projectId: string
      userId: string
    }

    await step.run('run-ingest-graph', async () => {
      const supabase = createServiceClient()
      const graph = buildIngestGraph(supabase)
      await graph.invoke({ projectId, userId, manuscriptId, totalInputTokens: 0, totalOutputTokens: 0 })
    })

    // After ingestion, dispatch downstream jobs for each character and chunk
    const supabase = createServiceClient()

    const { data: characters } = await supabase
      .from('characters')
      .select('id')
      .eq('project_id', projectId)

    if (characters && characters.length > 0) {
      await step.run('dispatch-character-jobs', async () => {
        await Promise.all(
          characters.map((c) =>
            inngest.send({
              name: 'character/refresh-profile',
              data: { characterId: c.id, projectId, userId },
            })
          )
        )
      })
    }

    // Culture flags and untranslatable passages are already extracted and saved
    // during ingestion — Jobs 3 and 5 are on-demand only (user-triggered per chapter).

    return { success: true, manuscriptId, projectId }
  }
)
