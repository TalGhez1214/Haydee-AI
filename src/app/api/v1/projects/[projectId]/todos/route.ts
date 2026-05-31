import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: { projectId: string } }

const CreateTodoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  linked_type: z
    .enum(['flag', 'character', 'glossary_term', 'author_question', 'none'])
    .default('none'),
  linked_id: z.string().uuid().optional(),
})

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')

  const supabase = createClient()
  let query = supabase
    .from('project_todos')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  if (status && ['open', 'done'].includes(status)) {
    query = query.eq('status', status as 'open' | 'done')
  }
  if (priority && ['high', 'medium', 'low'].includes(priority)) {
    query = query.eq('priority', priority as 'high' | 'medium' | 'low')
  }

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = CreateTodoSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_todos')
    .insert({
      project_id: params.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      linked_type: parsed.data.linked_type,
      linked_id: parsed.data.linked_id ?? null,
      auto_generated: false,
      status: 'open',
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
