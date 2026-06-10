import { requireAuth } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { assistantGraph } from '@/lib/ai/graphs/assistant-graph'
import { buildAssistantSystemPrompt } from '@/lib/ai/prompts/assistant-prompts'
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
})

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400)

  const { message, history, chapterNumber } = parsed.data
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

  const messages = [
    ...history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(message),
  ]

  const eventStream = assistantGraph.streamEvents(
    { messages, systemPrompt },
    { version: 'v2' }
  )

  // Approximate token counts for cost logging
  const inputTokens = Math.ceil((systemPrompt + JSON.stringify(messages)).length / 4)
  let outputChars = 0

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of eventStream) {
          if (event.event === 'on_chat_model_stream') {
            const content = event.data.chunk?.content
            const text =
              typeof content === 'string'
                ? content
                : Array.isArray(content)
                  ? content.map((c: { text?: string }) => c.text ?? '').join('')
                  : ''
            if (text) {
              outputChars += text.length
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`))
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        // Log cost after streaming completes
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
