'use client'

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react'

export type AssistantContext = {
  currentPage: string
  chapterNumber?: number
  openFlagsCount: number
  pendingGlossaryCount: number
  unconfirmedCharactersCount: number
  pendingQuestionsCount: number
  projectId: string
}

interface CtxValue {
  context: AssistantContext | null
  setContext: Dispatch<SetStateAction<AssistantContext | null>>
}

const AssistantCtx = createContext<CtxValue | null>(null)

export function AssistantContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<AssistantContext | null>(null)
  return <AssistantCtx.Provider value={{ context, setContext }}>{children}</AssistantCtx.Provider>
}

export function useAssistantContext() {
  const ctx = useContext(AssistantCtx)
  if (!ctx) throw new Error('useAssistantContext must be used within AssistantContextProvider')
  return ctx
}
