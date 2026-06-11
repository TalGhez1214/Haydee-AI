import { requireAuth } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { assistantGraph } from '@/lib/ai/graphs/assistant-graph'
import { buildAssistantSystemPrompt, buildScopeContext } from '@/lib/ai/prompts/assistant-prompts'
import { buildAssistantContext } from '@/lib/ai/rag/context-builder'
import { logAiCall } from '@/lib/ai/utils/cost'

type Params = { params: { projectId: string } }

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(10)
    .default([]),
  chapterNumber: z.number().int().optional(),
  useWebSearch: z.boolean().default(false),
})

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400)

  const { message, history, chapterNumber, useWebSearch } = parsed.data
  const supabase = createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, source_language, target_language, genre, author_name')
    .eq('id', params.projectId)
    .single()

  if (!project) return apiError('Project not found', 404)

  // Build RAG context: relevant chapter summaries + characters + approved glossary
  const ragContext = await buildAssistantContext(
    supabase,
    params.projectId,
    message,
    chapterNumber
  )

  const systemPrompt = buildAssistantSystemPrompt(project, ragContext)
  const scopeContext = buildScopeContext(project, ragContext)

  const messages = [
    ...history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(message),
  ]

  const eventStream = assistantGraph.streamEvents(
    { messages, systemPrompt, scopeContext, useWebSearch },
    { version: 'v2' }
  )

  const inputTokens = Math.ceil(
    (systemPrompt + scopeContext + JSON.stringify(messages)).length / 4
  )
  let outputChars = 0
  let tokenStreamed = false
  let blockedMessageText: string | null = null

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of eventStream) {
          // Stream tokens only from the main response node
          if (
            event.event === 'on_chat_model_stream' &&
            (event.metadata as Record<string, unknown>)?.langgraph_node === 'llm_response'
          ) {
            const content = event.data.chunk?.content
            const text =
              typeof content === 'string'
                ? content
                : Array.isArray(content)
                  ? content.map((c: { text?: string }) => c.text ?? '').join('')
                  : ''
            if (text) {
              tokenStreamed = true
              outputChars += text.length
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`))
            }
          }

          // Capture block message from blocked_response node
          if (
            event.event === 'on_chain_end' &&
            (event.metadata as Record<string, unknown>)?.langgraph_node === 'blocked_response'
          ) {
            const output = event.data?.output as { messages?: { content: unknown }[] } | undefined
            const lastMsg = output?.messages?.[output.messages.length - 1]
            if (lastMsg) {
              blockedMessageText =
                typeof lastMsg.content === 'string' ? lastMsg.content : String(lastMsg.content)
            }
          }
        }

        // Stream block message word-by-word (blocked path)
        if (!tokenStreamed && blockedMessageText) {
          outputChars = blockedMessageText.length
          const words = blockedMessageText.split(' ')
          for (let i = 0; i < words.length; i++) {
            const chunk = i < words.length - 1 ? words[i] + ' ' : words[i]
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            await new Promise<void>((resolve) => setTimeout(resolve, 30))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        const outputTokens = Math.ceil(outputChars / 4)
        await logAiCall({
          supabase,
          projectId: params.projectId,
          userId: (await supabase.auth.getUser()).data.user?.id ?? '',
          jobType: 'assistant',
          inputTokens,
          outputTokens,
        })
      } catch {
        controller.enqueue(encoder.encode('data: [ERROR]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
