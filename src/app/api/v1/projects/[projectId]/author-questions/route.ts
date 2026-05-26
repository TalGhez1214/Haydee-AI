import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const CreateQuestionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  chunk_id: z.string().uuid().optional(),
  translator_note: z.string().optional(),
})

type Params = { params: { projectId: string } }

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createClient()
  let query = supabase
    .from('author_questions')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  if (status && ['sent', 'pending', 'answered', 'resolved'].includes(status)) {
    query = query.eq(
      'status',
      status as 'sent' | 'pending' | 'answered' | 'resolved'
    )
  }

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = CreateQuestionSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('author_questions')
    .insert({
      project_id: params.projectId,
      question_text: parsed.data.question_text,
      chunk_id: parsed.data.chunk_id ?? null,
      translator_note: parsed.data.translator_note ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
