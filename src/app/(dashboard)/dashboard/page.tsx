import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/dashboard/project-card'
import { NeedsAttentionQueue } from '@/components/dashboard/needs-attention-queue'
import { NewProjectButton } from '@/components/projects/new-project-button'
import type { AttentionItem } from '@/components/dashboard/needs-attention-queue'
import type { FlagRow, GlossaryTermRow, ProjectRow } from '@/types/database'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  const projectList: ProjectRow[] = projects ?? []
  const projectIds = projectList.map((p) => p.id)

  // Fetch open flags and pending terms in parallel
  const [flagsResult, termsResult, userResult] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from('flags')
          .select('id, project_id, severity, flag_type, passage, explanation, status')
          .in('project_id', projectIds)
          .eq('status', 'open')
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase
          .from('glossary_terms')
          .select('id, project_id, source_term, term_type')
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .limit(5)
      : Promise.resolve({ data: [] }),
    supabase.from('users').select('full_name').eq('id', user.id).single(),
  ])

  const flags: Pick<FlagRow, 'id' | 'project_id' | 'severity' | 'flag_type' | 'passage' | 'explanation' | 'status'>[] =
    flagsResult.data ?? []
  const pendingTerms: Pick<GlossaryTermRow, 'id' | 'project_id' | 'source_term' | 'term_type'>[] =
    termsResult.data ?? []
  const displayName = userResult.data?.full_name ?? user.email ?? 'there'

  // Compute open flag count per project
  const flagCountByProject: Record<string, number> = {}
  for (const flag of flags) {
    flagCountByProject[flag.project_id] = (flagCountByProject[flag.project_id] ?? 0) + 1
  }

  // Build attention queue: high-severity flags first, then pending terms
  const projectTitleById: Record<string, string> = {}
  for (const p of projectList) projectTitleById[p.id] = p.title

  const highFlags = flags
    .filter((f) => f.severity === 'high')
    .slice(0, 5)

  const attentionItems: AttentionItem[] = [
    ...highFlags.map((f) => ({
      id: f.id,
      type: 'flag' as const,
      project_id: f.project_id,
      project_title: projectTitleById[f.project_id] ?? 'Unknown project',
      label: f.passage ? `"${f.passage.slice(0, 60)}…"` : `${f.flag_type} flag`,
      severity: f.severity as 'high',
    })),
    ...pendingTerms.slice(0, Math.max(0, 8 - highFlags.length)).map((t) => ({
      id: t.id,
      type: 'glossary' as const,
      project_id: t.project_id,
      project_title: projectTitleById[t.project_id] ?? 'Unknown project',
      label: `"${t.source_term}" needs a translation`,
    })),
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">
            Welcome back, {displayName.split(' ')[0]}
          </p>
        </div>
        <NewProjectButton />
      </div>

      {projectList.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[var(--text-tertiary)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">No projects yet</p>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 max-w-[300px]">
              Create your first project to start translating with AI assistance.
            </p>
          </div>
          <NewProjectButton />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Projects grid */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
              Active Projects ({projectList.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectList.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  openFlagsCount={flagCountByProject[project.id] ?? 0}
                />
              ))}
            </div>
          </section>

          {/* Needs Attention */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
              Needs Attention
            </h2>
            <NeedsAttentionQueue items={attentionItems} />
          </section>
        </div>
      )}
    </div>
  )
}
