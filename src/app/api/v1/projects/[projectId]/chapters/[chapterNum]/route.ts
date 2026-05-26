import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string; chapterNum: string } }

export async function GET(_req: Request, { params }: Params) {
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

  const { data: chunk, error } = await supabase
    .from('chunks')
    .select('*')
    .eq('manuscript_id', manuscript.id)
    .eq('chapter_number', chapterNum)
    .single()

  if (error || !chunk) return apiError('Chapter not found', 404)

  const { data: flags } = await supabase
    .from('flags')
    .select('*')
    .eq('chunk_id', chunk.id)
    .order('created_at', { ascending: true })

  return apiSuccess({ chunk, flags: flags ?? [] })
}
