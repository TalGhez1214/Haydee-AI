import { StateGraph, Annotation, START, END, messagesStateReducer } from '@langchain/langgraph'
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { llm } from '@/lib/anthropic/client'
import { tavilySearch, type TavilySearchResult } from '@/lib/ai/tools/tavily-search'
import { SCOPE_CHECK_SYSTEM_PROMPT, buildScopeCheckUserPrompt } from '@/lib/ai/prompts/assistant-prompts'

const haikuLlm = new ChatAnthropic({
  model: 'claude-haiku-4-5-20251001',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0,
  maxRetries: 2,
})

// ─── State ────────────────────────────────────────────────────────────────────

const AssistantState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  systemPrompt: Annotation<string>({ reducer: (_, y) => y, default: () => '' }),
  scopeContext: Annotation<string>({ reducer: (_, y) => y, default: () => '' }),
  useWebSearch: Annotation<boolean>({ reducer: (_, y) => y, default: () => false }),
  inScope: Annotation<boolean>({ reducer: (_, y) => y, default: () => true }),
  blockMessage: Annotation<string | null>({ reducer: (_, y) => y, default: () => null }),
  searchResults: Annotation<TavilySearchResult[] | null>({
    reducer: (_, y) => y,
    default: () => null,
  }),
})

// ─── Nodes ────────────────────────────────────────────────────────────────────

async function scopeCheck(state: typeof AssistantState.State) {
  const lastHuman = [...state.messages].reverse().find((m) => m instanceof HumanMessage)
  const userMessage = typeof lastHuman?.content === 'string' ? lastHuman.content : ''

  const response = await haikuLlm.invoke([
    new SystemMessage(SCOPE_CHECK_SYSTEM_PROMPT),
    new HumanMessage(buildScopeCheckUserPrompt(state.scopeContext, userMessage)),
  ])

  const text = typeof response.content === 'string' ? response.content.trim() : ''

  try {
    // Strip markdown code fences if the model wraps the JSON
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(json) as { inScope?: unknown; blockMessage?: unknown }
    return {
      inScope: parsed.inScope !== false,
      blockMessage: typeof parsed.blockMessage === 'string' ? parsed.blockMessage : null,
    }
  } catch {
    // If parsing fails, default to allowing — never wrongly block a translator
    return { inScope: true, blockMessage: null }
  }
}

function blockedResponse(state: typeof AssistantState.State) {
  const msg =
    state.blockMessage ??
    "I'm focused on translation work for this project. Try asking about the book, its characters, cultural context, or translation decisions!"
  return { messages: [new AIMessage(msg)] }
}

async function webSearch(state: typeof AssistantState.State) {
  const lastHuman = [...state.messages].reverse().find((m) => m instanceof HumanMessage)
  const query = typeof lastHuman?.content === 'string' ? lastHuman.content : ''
  if (!query) return { searchResults: null }

  try {
    const results = await tavilySearch(query, 5)
    return { searchResults: results }
  } catch (err) {
    console.error('[web_search] Tavily error:', err)
    return { searchResults: null }
  }
}

async function llmResponse(state: typeof AssistantState.State) {
  const inputMessages: BaseMessage[] = [new SystemMessage(state.systemPrompt)]

  if (state.searchResults && state.searchResults.length > 0) {
    const searchBlock = state.searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content}`)
      .join('\n\n')
    // Synthetic context message — not persisted to state.messages
    inputMessages.push(
      new HumanMessage(
        `[Web search results — use these to inform your answer]\n\n${searchBlock}\n\n[End of search results]`
      )
    )
  }

  inputMessages.push(...state.messages)

  const response = await llm.invoke(inputMessages)
  return { messages: [response] }
}

// ─── Routing ──────────────────────────────────────────────────────────────────

function routeAfterScopeCheck(state: typeof AssistantState.State): string {
  if (!state.inScope) return 'blocked_response'
  return state.useWebSearch ? 'web_search' : 'llm_response'
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export const assistantGraph = new StateGraph(AssistantState)
  .addNode('scope_check', scopeCheck)
  .addNode('blocked_response', blockedResponse)
  .addNode('web_search', webSearch)
  .addNode('llm_response', llmResponse)
  .addEdge(START, 'scope_check')
  .addConditionalEdges('scope_check', routeAfterScopeCheck, {
    blocked_response: 'blocked_response',
    web_search: 'web_search',
    llm_response: 'llm_response',
  })
  .addEdge('blocked_response', END)
  .addEdge('web_search', 'llm_response')
  .addEdge('llm_response', END)
  .compile()
