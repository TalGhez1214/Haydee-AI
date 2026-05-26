'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/settings': 'Settings',
}

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]

  // /projects/[id]/characters → "Characters"
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]

  const SEGMENT_LABELS: Record<string, string> = {
    projects: 'Projects',
    manuscript: 'Manuscript',
    characters: 'Characters',
    glossary: 'Glossary',
    'culture-queue': 'Culture Queue',
    'author-qa': 'Author Q&A',
    settings: 'Settings',
    dashboard: 'Dashboard',
  }

  return SEGMENT_LABELS[last] ?? last.charAt(0).toUpperCase() + last.slice(1)
}

export function Topbar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const title = getTitle(pathname)
  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm px-6">
      <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">{title}</h1>

      <div className="flex items-center gap-3">
        {user?.email && (
          <span className="text-[12px] text-[var(--text-tertiary)] hidden sm:block">
            {user.email}
          </span>
        )}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-[11px] font-semibold">
          {initial}
        </div>
      </div>
    </header>
  )
}
