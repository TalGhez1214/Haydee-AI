import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: { projectId: string } }

const BookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
})

const CreateNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(''),
  category: z
    .enum(['research', 'preface_draft', 'reference', 'bookmark'])
    .default('research'),
  tags: z.array(z.string()).default([]),
  linked_chapter: z.number().int().positive().optional(),
  linked_character: z.string().uuid().nullable().optional(),
  bookmarks: z.array(BookmarkSchema).default([]),
})

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const tag = searchParams.get('tag')

  const supabase = createClient()
  let query = supabase
    .from('research_notes')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  if (category && ['research', 'preface_draft', 'reference', 'bookmark'].includes(category)) {
    query = query.eq(
      'category',
      category as 'research' | 'preface_draft' | 'reference' | 'bookmark'
    )
  }
  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = CreateNoteSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('research_notes')
    .insert({
      project_id: params.projectId,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      tags: parsed.data.tags,
      linked_chapter: parsed.data.linked_chapter ?? null,
      linked_character: parsed.data.linked_character ?? null,
      bookmarks: parsed.data.bookmarks as unknown as import('@/types/database').Bookmark[],
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
