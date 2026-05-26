import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

type Params = { params: { projectId: string; chapterNum: string } }

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const chapterNum = parseInt(params.chapterNum, 10)
  if (isNaN(chapterNum)) return apiError('Invalid chapter number', 400)

  const supabase = createClient()

  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('id')
    .eq('project_id', params.projectId)
    .single()

  if (!manuscript) return apiError('No manuscript found for this project', 404)

  const { data: chunk } = await supabase
    .from('chunks')
    .select('id')
    .eq('manuscript_id', manuscript.id)
    .eq('chapter_number', chapterNum)
    .single()

  if (!chunk) return apiError('Chapter not found', 404)

  try {
    await inngest.send({
      name: 'chapter/consistency-check',
      data: {
        projectId: params.projectId,
        chunkId: chunk.id,
        chapterNumber: chapterNum,
        userId: auth.user.id,
      },
    })
  } catch {
    return apiError('Failed to queue consistency check', 500)
  }

  return apiSuccess({ message: 'Consistency check queued' })
}
