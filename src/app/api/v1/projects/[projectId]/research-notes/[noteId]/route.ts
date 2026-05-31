import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Bookmark } from '@/types/database'

type Params = { params: { projectId: string; noteId: string } }

const BookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
})

const UpdateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  category: z.enum(['research', 'preface_draft', 'reference', 'bookmark']).optional(),
  tags: z.array(z.string()).optional(),
  linked_chapter: z.number().int().positive().nullable().optional(),
  linked_character: z.string().uuid().nullable().optional(),
  bookmarks: z.array(BookmarkSchema).optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('research_notes')
    .select('*')
    .eq('id', params.noteId)
    .eq('project_id', params.projectId)
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Note not found', 404)
  return apiSuccess(data)
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = UpdateNoteSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  const { bookmarks: rawBookmarks, ...rest } = parsed.data
  const updatePayload: Partial<import('@/types/database').ResearchNoteInsert> & { updated_at?: string } = {
    ...rest,
    updated_at: new Date().toISOString(),
    ...(rawBookmarks !== undefined
      ? { bookmarks: rawBookmarks.map((b) => ({ url: b.url, title: b.title, description: b.description ?? null })) as Bookmark[] }
      : {}),
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('research_notes')
    .update(updatePayload)
    .eq('id', params.noteId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Note not found', 404)
  return apiSuccess(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('research_notes')
    .delete()
    .eq('id', params.noteId)
    .eq('project_id', params.projectId)

  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
