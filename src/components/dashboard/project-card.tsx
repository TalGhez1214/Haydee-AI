import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { IconAlertTriangle, IconCalendar, IconArrowRight } from '@tabler/icons-react'
import type { ProjectRow } from '@/types/database'

interface ProjectCardProps {
  project: ProjectRow
  openFlagsCount: number
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const filled = (pct / 100) * circumference

  return (
    <div className="relative w-[52px] h-[52px] flex-shrink-0">
      <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="var(--bg-muted)"
          strokeWidth="4"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[var(--text-primary)]">
        {pct}%
      </span>
    </div>
  )
}

export function ProjectCard({ project, openFlagsCount }: ProjectCardProps) {
  const pct =
    project.word_count_total > 0
      ? Math.min(100, Math.round((project.word_count_translated / project.word_count_total) * 100))
      : 0

  const deadline = project.deadline ? new Date(project.deadline) : null
  const now = new Date()
  const isOverdue = deadline ? deadline < now : false
  const daysUntil = deadline
    ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
    : null

  let deadlineText: string | null = null
  if (deadline) {
    if (isOverdue) {
      deadlineText = `Overdue by ${Math.abs(daysUntil!)} day${Math.abs(daysUntil!) !== 1 ? 's' : ''}`
    } else if (daysUntil === 0) {
      deadlineText = 'Due today'
    } else {
      deadlineText = `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`
    }
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5 hover:shadow-panel hover:border-[var(--border-strong)] transition-all duration-quick group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-[var(--text-primary)] truncate leading-snug">
            {project.title}
          </p>
          {project.author_name && (
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">
              {project.author_name}
            </p>
          )}
        </div>
        <Badge variant={project.status} />
      </div>

      <div className="flex items-center gap-4">
        <ProgressRing pct={pct} />

        <div className="flex-1 space-y-1.5 min-w-0">
          <p className="text-[12px] text-[var(--text-tertiary)]">
            {project.source_language} → {project.target_language}
          </p>

          {openFlagsCount > 0 && (
            <div className="flex items-center gap-1 text-[12px] text-danger">
              <IconAlertTriangle size={12} />
              <span>
                {openFlagsCount} open flag{openFlagsCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {deadlineText && (
            <div
              className={`flex items-center gap-1 text-[12px] ${
                isOverdue
                  ? 'text-danger'
                  : daysUntil !== null && daysUntil <= 7
                  ? 'text-warning'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <IconCalendar size={12} />
              <span>{deadlineText}</span>
            </div>
          )}
        </div>

        <IconArrowRight
          size={16}
          className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity duration-quick flex-shrink-0"
        />
      </div>
    </Link>
  )
}
