import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { NewProjectButton } from '@/components/projects/new-project-button'
import { IconAlertTriangle, IconCalendar, IconChevronRight } from '@tabler/icons-react'
import type { ProjectRow } from '@/types/database'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const statusFilter = searchParams.status ?? 'active'

  const query = supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (statusFilter === 'active') {
    query.neq('status', 'archived')
  } else if (statusFilter === 'archived') {
    query.eq('status', 'archived')
  }

  const { data: projects } = await query
  const projectList: ProjectRow[] = projects ?? []
  const projectIds = projectList.map((p) => p.id)

  const flagCountByProject: Record<string, number> = {}
  if (projectIds.length > 0) {
    const { data: flags } = await supabase
      .from('flags')
      .select('project_id')
      .in('project_id', projectIds)
      .eq('status', 'open')
    for (const f of flags ?? []) {
      flagCountByProject[f.project_id] = (flagCountByProject[f.project_id] ?? 0) + 1
    }
  }

  const now = new Date()

  const STATUS_TABS = [
    { label: 'Active', value: 'active' },
    { label: 'All', value: 'all' },
    { label: 'Archived', value: 'archived' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Projects</h1>
        <NewProjectButton />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--bg-muted)] p-1 rounded-[6px] w-fit">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/projects?status=${tab.value}`}
            className={`px-3 py-1.5 rounded-[4px] text-[13px] font-medium transition-colors duration-quick
              ${statusFilter === tab.value
                ? 'bg-[var(--bg)] text-[var(--text-primary)] shadow-card'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {projectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-[15px] font-medium text-[var(--text-primary)]">
            {statusFilter === 'archived' ? 'No archived projects' : 'No projects yet'}
          </p>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {statusFilter === 'archived'
              ? 'Archived projects will appear here.'
              : 'Create your first project to get started.'}
          </p>
          {statusFilter !== 'archived' && <NewProjectButton />}
        </div>
      ) : (
        <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_100px_80px_40px] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Project
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Status
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Progress
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Flags
            </span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--border)]">
            {projectList.map((project) => {
              const pct =
                project.word_count_total > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (project.word_count_translated / project.word_count_total) * 100
                      )
                    )
                  : 0
              const deadline = project.deadline ? new Date(project.deadline) : null
              const isOverdue = deadline ? deadline < now : false
              const daysLeft = deadline
                ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
                : null
              const openFlags = flagCountByProject[project.id] ?? 0

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="grid grid-cols-[1fr_120px_100px_80px_40px] gap-4 px-5 py-4 items-center hover:bg-[var(--bg-subtle)] transition-colors duration-quick group"
                >
                  {/* Title + author + deadline */}
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                      {project.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {project.author_name && (
                        <span className="text-[12px] text-[var(--text-secondary)] truncate max-w-[180px]">
                          {project.author_name}
                        </span>
                      )}
                      {deadline && (
                        <span
                          className={`flex items-center gap-1 text-[12px] ${
                            isOverdue
                              ? 'text-danger'
                              : daysLeft !== null && daysLeft <= 7
                              ? 'text-warning'
                              : 'text-[var(--text-tertiary)]'
                          }`}
                        >
                          <IconCalendar size={11} />
                          {isOverdue
                            ? 'Overdue'
                            : daysLeft === 0
                            ? 'Today'
                            : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge variant={project.status} />
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[12px] text-[var(--text-secondary)] w-8 text-right">
                      {pct}%
                    </span>
                  </div>

                  {/* Flag count */}
                  <div>
                    {openFlags > 0 ? (
                      <span className="flex items-center gap-1 text-[12px] text-danger">
                        <IconAlertTriangle size={12} />
                        {openFlags}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[var(--text-tertiary)]">—</span>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-end">
                    <IconChevronRight
                      size={16}
                      className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
