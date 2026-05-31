'use client'

import { usePathname } from 'next/navigation'
import { useAssistantContext } from './assistant-context'
import { AssistantPanel } from './assistant-panel'

export function AssistantPortal() {
  const pathname = usePathname()
  const { context } = useAssistantContext()

  // Only show on project pages
  const isProjectPage = /\/projects\/[^/]+/.test(pathname)
  if (!isProjectPage) return null

  return <AssistantPanel context={context} />
}
