'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  IconArrowLeft,
  IconFileText,
  IconUsers,
  IconBook2,
  IconWorld,
  IconMessageQuestion,
  IconChecklist,
  IconNotebook,
  IconCalendar,
  IconFlag,
} from '@tabler/icons-react'
import type { ProjectRow } from '@/types/database'

interface Badges {
  cultureFlagsOpen: number
  untranslatableOpen: number
  pendingQuestions: number
  openTodos: number
}

interface ProjectNavProps {
  project: ProjectRow
  badges: Badges
  projectId: string
}

const TABS = [
  { label: 'Manuscript',    segment: 'manuscript',    icon: IconFileText,        badgeKey: 'untranslatableOpen' as const },
  { label: 'Characters',    segment: 'characters',    icon: IconUsers,           badgeKey: null },
  { label: 'Glossary',      segment: 'glossary',      icon: IconBook2,           badgeKey: null },
  { label: 'Culture Queue', segment: 'culture-queue', icon: IconWorld,           badgeKey: 'cultureFlagsOpen' as const },
  { label: 'Author Q&A',    segment: 'author-qa',     icon: IconMessageQuestion, badgeKey: 'pendingQuestions' as const },
  { label: 'To-Do',         segment: 'todo-list',     icon: IconChecklist,       badgeKey: 'openTodos' as const },
  { label: 'Research',      segment: 'research',      icon: IconNotebook,        badgeKey: null },
]

export function ProjectNav({ project, badges, projectId }: ProjectNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const activeSegment = pathname.split('/')[3] ?? 'manuscript'

  useEffect(() => {
    TABS.forEach(({ segment }) => router.prefetch(`/projects/${projectId}/${segment}`))
  }, [projectId, router])

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  const pct =
    project.word_count_total > 0
      ? Math.min(100, Math.round((project.word_count_translated / project.word_count_total) * 100))
      : 0

  const now = new Date()
  const deadline = project.deadline ? new Date(project.deadline) : null
  const isOverdue = deadline ? deadline < now : false
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000) : null

  const openFlagsTotal = badges.cultureFlagsOpen + badges.untranslatableOpen

  return (
    <div className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      {/* Row 1 — Title bar */}
      <div className="flex h-14 items-center justify-between px-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <IconArrowLeft size={15} />
            <span>Projects</span>
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
            {project.title}
          </h1>
          {project.source_language && project.target_language && (
            <span className="hidden sm:inline text-[12px] text-[var(--text-tertiary)] shrink-0">
              {project.source_language} → {project.target_language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user?.email && (
            <span className="text-[12px] text-[var(--text-tertiary)] hidden sm:block">
              {user.email}
            </span>
          )}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-[11px] font-semibold">
            {initial}
          </div>
        </div>
      </div>

      {/* Row 2 — Tab bar */}
      <div className="flex items-end gap-0 px-6 border-b border-[var(--border)] bg-[var(--bg)]">
        {TABS.map(({ label, segment, icon: Icon, badgeKey }) => {
          const count = badgeKey ? badges[badgeKey] : 0
          const isActive = activeSegment === segment
          return (
            <Link
              key={segment}
              href={`/projects/${projectId}/${segment}`}
              className={`relative flex items-center gap-1.5 px-3 h-9 text-[13px] font-medium border-b-2 transition-colors duration-quick whitespace-nowrap ${
                isActive
                  ? 'text-[var(--brand)] border-[var(--brand)] -mb-px'
                  : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className="ml-0.5 h-4 min-w-[16px] px-1 rounded-full bg-brand text-white text-[10px] font-medium leading-4 text-center tabular-nums">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Row 3 — Progress strip */}
      <div className="flex h-10 items-center justify-between px-6 bg-[var(--bg-subtle)]">
        {/* Left: progress bar + word counts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-32 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-panel"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12px] font-medium text-[var(--text-primary)] tabular-nums">
              {pct}%
            </span>
          </div>
          <span className="text-[12px] text-[var(--text-tertiary)] tabular-nums">
            {project.word_count_translated.toLocaleString()} / {project.word_count_total.toLocaleString()} words
          </span>
        </div>

        {/* Right: deadline + flags */}
        <div className="flex items-center gap-4">
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
              <IconCalendar size={13} />
              {isOverdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
            </span>
          )}
          {openFlagsTotal > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-danger">
              <IconFlag size={13} />
              {openFlagsTotal} {openFlagsTotal === 1 ? 'flag' : 'flags'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
