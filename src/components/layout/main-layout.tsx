import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-subtle)]">
      <Sidebar />

      {/* Content area pushed right of collapsed sidebar (56px) */}
      <div className="flex flex-1 flex-col ml-sidebar min-w-0">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
