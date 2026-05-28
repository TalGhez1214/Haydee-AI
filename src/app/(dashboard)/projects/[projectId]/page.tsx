import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  IconUsers,
  IconBook2,
  IconWorld,
  IconFileText,
  IconMessageQuestion,
  IconChecklist,
  IconCalendar,
  IconArrowLeft,
  IconChevronRight,
} from '@tabler/icons-react'

interface Tile {
  icon: React.ReactNode
  title: string
  description: string
  count?: number
  countLabel?: string
  href: string
  accent: string
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single()

  if (!project) notFound()

  // Fetch counts in parallel
  const [charRes, glossaryRes, pendingGlossaryRes, cultureFlagsRes, untranslatableRes, questionsRes] =
    await Promise.all([
      supabase
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', params.projectId),
      supabase
        .from('glossary_terms')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', params.projectId),
      supabase
        .from('glossary_terms')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', params.projectId)
        .eq('status', 'pending'),
      supabase
        .from('flags')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', params.projectId)
        .eq('flag_type', 'culture')
        .eq('status', 'open'),
      supabase
        .from('flags')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', params.projectId)
        .eq('flag_type', 'untranslatable')
        .eq('status', 'open'),
      supabase
        .from('author_questions')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', params.projectId)
        .eq('status', 'pending'),
    ])

  const characterCount = charRes.count ?? 0
  const glossaryCount = glossaryRes.count ?? 0
  const pendingGlossaryCount = pendingGlossaryRes.count ?? 0
  const openCultureFlagsCount = cultureFlagsRes.count ?? 0
  const openUntranslatableCount = untranslatableRes.count ?? 0
  const openFlagsCount = openCultureFlagsCount + openUntranslatableCount
  const pendingQuestionsCount = questionsRes.count ?? 0

  const base = `/projects/${params.projectId}`

  const tiles: Tile[] = [
    {
      icon: <IconUsers size={22} />,
      title: 'Characters',
      description: 'Track character names, roles, and voice profiles.',
      count: characterCount,
      countLabel: characterCount === 1 ? 'character' : 'characters',
      href: `${base}/characters`,
      accent: 'text-brand',
    },
    {
      icon: <IconBook2 size={22} />,
      title: 'Glossary',
      description: 'Manage approved translations for recurring terms.',
      count: pendingGlossaryCount > 0 ? pendingGlossaryCount : glossaryCount,
      countLabel: pendingGlossaryCount > 0 ? 'pending' : 'all approved',
      href: `${base}/glossary`,
      accent: 'text-success',
    },
    {
      icon: <IconWorld size={22} />,
      title: 'Culture Queue',
      description: 'Review culturally non-portable passages, severity-ranked.',
      count: openCultureFlagsCount,
      countLabel: openCultureFlagsCount === 1 ? 'open flag' : 'open flags',
      href: `${base}/culture-queue`,
      accent: 'text-warning',
    },
    {
      icon: <IconFileText size={22} />,
      title: 'Manuscript',
      description: 'Read source text with inline highlights for all flag types.',
      count: openUntranslatableCount,
      countLabel: openUntranslatableCount === 1 ? 'untranslatable passage' : 'untranslatable passages',
      href: `${base}/manuscript`,
      accent: 'text-info',
    },
    {
      icon: <IconMessageQuestion size={22} />,
      title: 'Author Q&A',
      description: 'Track questions for the author and log their responses.',
      count: pendingQuestionsCount,
      countLabel: pendingQuestionsCount === 1 ? 'pending question' : 'pending questions',
      href: `${base}/author-qa`,
      accent: 'text-brand',
    },
    {
      icon: <IconChecklist size={22} />,
      title: 'Consistency Check',
      description: 'Scan your draft for name and term drift against approved choices.',
      href: `${base}/manuscript`,
      accent: 'text-danger',
    },
  ]

  const pct =
    project.word_count_total > 0
      ? Math.min(
          100,
          Math.round((project.word_count_translated / project.word_count_total) * 100)
        )
      : 0

  const deadline = project.deadline ? new Date(project.deadline) : null
  const now = new Date()
  const isOverdue = deadline ? deadline < now : false
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
    : null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-quick mb-5"
      >
        <IconArrowLeft size={14} />
        All Projects
      </Link>

      {/* Hero */}
      <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[20px] font-semibold text-[var(--text-primary)] truncate">
                {project.title}
              </h1>
              <Badge variant={project.status} />
            </div>
            {project.author_name && (
              <p className="text-[14px] text-[var(--text-secondary)]">{project.author_name}</p>
            )}
            <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
              {project.source_language} → {project.target_language}
              {project.genre && ` · ${project.genre}`}
            </p>
          </div>

          {/* Stats cluster */}
          <div className="flex items-center gap-6 flex-shrink-0">
            {/* Progress */}
            <div className="text-center">
              <p className="text-[22px] font-semibold text-[var(--text-primary)]">{pct}%</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Translated
              </p>
            </div>

            {/* Deadline */}
            {deadline && (
              <div className="text-center">
                <p
                  className={`text-[22px] font-semibold ${
                    isOverdue ? 'text-danger' : daysLeft !== null && daysLeft <= 7 ? 'text-warning' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {isOverdue ? '!' : daysLeft === 0 ? '0' : daysLeft}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] flex items-center gap-1">
                  <IconCalendar size={10} />
                  {isOverdue ? 'Overdue' : 'Days left'}
                </p>
              </div>
            )}

            {/* Open flags */}
            <div className="text-center">
              <p
                className={`text-[22px] font-semibold ${
                  openFlagsCount > 0 ? 'text-danger' : 'text-[var(--text-primary)]'
                }`}
              >
                {openFlagsCount}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Open flags
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {project.word_count_total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-[var(--text-tertiary)]">
                {project.word_count_translated.toLocaleString()} /{' '}
                {project.word_count_total.toLocaleString()} words
              </span>
              <span className="text-[12px] text-[var(--text-tertiary)]">{pct}%</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feature tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5 hover:shadow-panel hover:border-[var(--border-strong)] transition-all duration-quick group flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className={`${tile.accent} opacity-80`}>{tile.icon}</div>
              <IconChevronRight
                size={16}
                className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity duration-quick"
              />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">{tile.title}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {tile.description}
              </p>
            </div>
            {tile.count !== undefined && (
              <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                {tile.count} {tile.countLabel}
              </p>
            )}
          </Link>
        ))}
      </div>

    </div>
  )
}
