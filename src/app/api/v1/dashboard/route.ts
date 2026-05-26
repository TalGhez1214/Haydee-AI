import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', auth.user.id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (projectsError) return apiError(projectsError.message, 500)

  const projectIds = (projects ?? []).map((p) => p.id)
  const noProjects = projectIds.length === 0

  const [highFlagsRes, pendingTermsRes] = await Promise.all([
    noProjects
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('flags')
          .select('*')
          .in('project_id', projectIds)
          .eq('status', 'open')
          .eq('severity', 'high')
          .order('created_at', { ascending: false })
          .limit(10),
    noProjects
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('glossary_terms')
          .select('*')
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .order('frequency', { ascending: false })
          .limit(10),
  ])

  const allProjects = projects ?? []
  const deadlineProjects = allProjects
    .filter((p) => p.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)

  const needsAttention = [
    ...(highFlagsRes.data ?? []).map((f) => ({
      type: 'high_flag' as const,
      project_id: f.project_id,
      item: f,
    })),
    ...(pendingTermsRes.data ?? []).map((t) => ({
      type: 'pending_term' as const,
      project_id: t.project_id,
      item: t,
    })),
  ]

  return apiSuccess({
    projects: allProjects,
    needs_attention: needsAttention,
    deadline_projects: deadlineProjects,
    stats: {
      total_projects: allProjects.length,
      in_progress: allProjects.filter((p) => p.status === 'in_progress').length,
    },
  })
}
