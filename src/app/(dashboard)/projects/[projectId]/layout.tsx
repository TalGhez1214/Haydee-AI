import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient, getAuthSession } from '@/lib/supabase/server'
import { ProjectNav } from '@/components/layout/project-nav'
import { ProjectNavSkeleton } from '@/components/layout/project-nav-skeleton'

interface Props {
  children: React.ReactNode
  params: { projectId: string }
}

// Runs deferred — does not block the layout from streaming its shell
async function ProjectNavLoader({ projectId, userId }: { projectId: string; userId: string }) {
  const supabase = createClient()
  const [projectRes, cultureRes, untranslatableRes, questionsRes, todosRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).eq('user_id', userId).single(),
    supabase.from('flags').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('flag_type', 'culture').eq('status', 'open'),
    supabase.from('flags').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('flag_type', 'untranslatable').eq('status', 'open'),
    supabase.from('author_questions').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'pending'),
    supabase.from('project_todos').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'open'),
  ])

  if (!projectRes.data) redirect('/projects')

  return (
    <ProjectNav
      project={projectRes.data}
      badges={{
        cultureFlagsOpen: cultureRes.count ?? 0,
        untranslatableOpen: untranslatableRes.count ?? 0,
        pendingQuestions: questionsRes.count ?? 0,
        openTodos: todosRes.count ?? 0,
      }}
      projectId={projectId}
    />
  )
}

export default async function ProjectLayout({ children, params }: Props) {
  const session = await getAuthSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<ProjectNavSkeleton />}>
        <ProjectNavLoader projectId={params.projectId} userId={session.user.id} />
      </Suspense>
      <div className="flex-1 min-h-0 overflow-auto">
        {children}
      </div>
    </div>
  )
}
