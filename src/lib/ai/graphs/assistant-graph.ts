import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { BaseMessage, SystemMessage } from '@langchain/core/messages'
import { llm } from '@/lib/anthropic/client'

const AssistantState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  systemPrompt: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
})

async function callLLM(state: typeof AssistantState.State) {
  const response = await llm.invoke([
    new SystemMessage(state.systemPrompt),
    ...state.messages,
  ])
  return { messages: [response] }
}

export const assistantGraph = new StateGraph(AssistantState)
  .addNode('llm', callLLM)
  .addEdge(START, 'llm')
  .addEdge('llm', END)
  .compile()
