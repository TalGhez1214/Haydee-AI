'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  IconLayoutDashboard,
  IconFolderOpen,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', icon: IconLayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: IconFolderOpen, label: 'Projects' },
  { href: '/settings', icon: IconSettings, label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'group fixed left-0 top-0 z-50 flex h-full flex-col',
        'w-sidebar hover:w-sidebar-open',
        'bg-[var(--bg)] border-r border-[var(--border)]',
        'transition-[width] duration-panel ease-panel overflow-hidden'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center px-3.5 border-b border-[var(--border)]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-brand text-white text-[13px] font-bold">
          H
        </div>
        <span className="ml-3 whitespace-nowrap text-[14px] font-semibold text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-panel">
          Haydee
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-9 items-center rounded-[6px] px-2.5 gap-3 transition-colors duration-quick',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
                isActive && 'bg-brand text-white hover:bg-brand-dark hover:text-white'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="whitespace-nowrap text-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-panel">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="flex h-9 w-full items-center rounded-[6px] px-2.5 gap-3 transition-colors duration-quick text-[var(--text-secondary)] hover:text-danger hover:bg-danger/10"
        >
          <IconLogout size={18} className="shrink-0" />
          <span className="whitespace-nowrap text-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-panel">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  )
}
