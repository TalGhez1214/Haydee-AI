import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ProjectNav } from '@/components/layout/project-nav'

interface Props {
  children: React.ReactNode
  params: { projectId: string }
}

export default async function ProjectLayout({ children, params }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createClient()
  const { projectId } = params

  const [
    projectRes,
    cultureRes,
    untranslatableRes,
    questionsRes,
    todosRes,
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).eq('user_id', user.id).single(),
    supabase.from('flags').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('flag_type', 'culture').eq('status', 'open'),
    supabase.from('flags').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('flag_type', 'untranslatable').eq('status', 'open'),
    supabase.from('author_questions').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'pending'),
    supabase.from('project_todos').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'open'),
  ])

  if (!projectRes.data) redirect('/projects')

  const badges = {
    cultureFlagsOpen: cultureRes.count ?? 0,
    untranslatableOpen: untranslatableRes.count ?? 0,
    pendingQuestions: questionsRes.count ?? 0,
    openTodos: todosRes.count ?? 0,
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectNav project={projectRes.data} badges={badges} projectId={projectId} />
      <div className="flex-1 min-h-0 overflow-auto">
        {children}
      </div>
    </div>
  )
}
