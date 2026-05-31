import { Sidebar } from './sidebar'
import { ConditionalTopbar } from './topbar'
import { AssistantContextProvider } from '@/components/assistant/assistant-context'
import { AssistantPortal } from '@/components/assistant/assistant-portal'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AssistantContextProvider>
      <div className="flex min-h-screen bg-[var(--bg-subtle)]">
        <Sidebar />

        {/* Content area pushed right of collapsed sidebar (56px) */}
        <div className="flex flex-1 flex-col ml-sidebar min-w-0">
          <ConditionalTopbar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>

        <AssistantPortal />
      </div>
    </AssistantContextProvider>
  )
}
