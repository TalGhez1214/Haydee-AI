import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author_name: z.string().optional(),
  source_language: z.string().min(1, 'Source language is required'),
  target_language: z.string().min(1, 'Target language is required'),
  genre: z.string().optional(),
  deadline: z.string().optional(),
  style_guide: z.string().optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', auth.user.id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, user_id: auth.user.id })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
