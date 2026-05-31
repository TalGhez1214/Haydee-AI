'use client'

import { useEffect } from 'react'
import { useAssistantContext, type AssistantContext } from './assistant-context'

type Props = Omit<AssistantContext, 'openFlagsCount' | 'pendingGlossaryCount' | 'unconfirmedCharactersCount' | 'pendingQuestionsCount'> &
  Partial<Pick<AssistantContext, 'openFlagsCount' | 'pendingGlossaryCount' | 'unconfirmedCharactersCount' | 'pendingQuestionsCount'>>

export function AssistantContextSetter(props: Props) {
  const { setContext } = useAssistantContext()

  useEffect(() => {
    setContext({
      currentPage: props.currentPage,
      chapterNumber: props.chapterNumber,
      openFlagsCount: props.openFlagsCount ?? 0,
      pendingGlossaryCount: props.pendingGlossaryCount ?? 0,
      unconfirmedCharactersCount: props.unconfirmedCharactersCount ?? 0,
      pendingQuestionsCount: props.pendingQuestionsCount ?? 0,
      projectId: props.projectId,
    })
    return () => setContext(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectId, props.currentPage])

  return null
}
