'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconX,
  IconPencil,
  IconHistory,
  IconArrowUp,
  IconMicrophone,
  IconPlayerStop,
  IconLink,
  IconSparkles,
  IconSearch,
} from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useApi } from '@/hooks/use-api'
import type { AssistantContext } from './assistant-context'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  { Icon: IconLink,     label: 'Suggest translation for this passage' },
  { Icon: IconSparkles, label: 'Give me an overview of my progress on this project' },
  { Icon: IconSearch,   label: 'Help me out with the character tone in this chapter' },
]

interface Props {
  context: AssistantContext | null
}

export function AssistantPanel({ context }: Props) {
  const { fetch: apiFetch } = useApi()
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const [thinking, setThinking]   = useState(false)
  const messagesEndRef      = useRef<HTMLDivElement>(null)
  const abortControllerRef  = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const projectId   = context?.projectId
  const lastUserIdx = messages.reduce<number>((acc, msg, i) => (msg.role === 'user' ? i : acc), -1)

  function editMessage(index: number) {
    setInput(messages[index].content)
    setMessages((prev) => prev.slice(0, index))
  }

  function stopStreaming() {
    abortControllerRef.current?.abort()
  }

  function newSession() {
    stopStreaming()
    setMessages([])
    setInput('')
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || streaming || !projectId) return

    setMessages((prev) => [...prev, { role: 'user', content }])
    setInput('')
    setStreaming(true)
    setThinking(true)

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/assistant`, {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          history,
          chapterNumber: context?.chapterNumber,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
        return
      }

      const reader      = res.body!.getReader()
      const decoder     = new TextDecoder()
      let buffer        = ''
      let accumulated   = ''

      setThinking(false)
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        if (controller.signal.aborted) { reader.cancel(); break }
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6)
            if (raw === '[DONE]' || raw === '[ERROR]') break
            try { accumulated += JSON.parse(raw) as string }
            catch { accumulated += raw }
            setMessages((prev) => {
              const updated = [...prev]
              const last    = updated[updated.length - 1]
              if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: accumulated }
              return updated
            })
          }
        }
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      if (!isAbort) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
      }
    } finally {
      setStreaming(false)
      setThinking(false)
      abortControllerRef.current = null
    }
  }

  return (
    <>
      {/* ── Floating trigger button ───────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Haydee Assistant"
        className="fixed bottom-6 right-6 z-[60] h-[52px] w-[52px] rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.18)] transition-all duration-[220ms] hover:scale-[1.08] active:scale-95"
        style={{ background: open ? '#1E293B' : '#334155' }}
      >
        <div className="flex items-center gap-[4px]">
          <span className="dot-pulse rounded-full bg-white block" style={{ width: 7, height: 7, animationDelay: '0s' }} />
          <span className="dot-pulse rounded-full bg-white block" style={{ width: 9, height: 9, animationDelay: '0.3s' }} />
          <span className="dot-pulse rounded-full bg-white block" style={{ width: 7, height: 7, animationDelay: '0.6s' }} />
        </div>
      </button>

      {/* ── Panel ────────────────────────────────────────────────── */}
      <div
        className={`fixed z-[59] w-[340px] flex flex-col rounded-[16px] border border-[var(--border)] shadow-[0_4px_24px_rgba(0,0,0,0.10)] bg-[var(--bg)] transition-all duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)] origin-bottom-right ${
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-0 pointer-events-none'
        }`}
        style={{ bottom: 88, right: 24 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo */}
            <div
              className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: '#0f0f1a' }}
            >
              <div className="flex items-center gap-[3px]">
                <span className="rounded-full block" style={{ width: 5, height: 5, background: '#334155', opacity: 0.5 }} />
                <span className="rounded-full block" style={{ width: 7, height: 7, background: '#334155' }} />
                <span className="rounded-full block" style={{ width: 5, height: 5, background: '#334155', opacity: 0.75 }} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">
                I&apos;m Haydee Assistant
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] leading-snug">
                Ask questions or explore your project details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={newSession}
              title="New chat"
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <IconPencil size={14} />
            </button>
            <button
              title="History"
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <IconHistory size={14} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[380px] scrollbar-thin">
          {messages.length === 0 ? (
            <div className="p-5 space-y-[10px]">
              {SUGGESTIONS.map(({ Icon, label }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(label)}
                  disabled={!projectId}
                  className="w-full flex items-center gap-3 px-3 py-[10px] rounded-lg border border-[var(--border)] text-left hover:border-[var(--border-strong)] hover:bg-[var(--bg-muted)] transition-colors duration-[150ms] disabled:opacity-40"
                >
                  <Icon size={15} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-[13px] text-[var(--text-primary)]">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {msg.role === 'assistant' && streaming && i === messages.length - 1 && msg.content === '' ? (
                    <div className="px-3 py-3 rounded-[12px] bg-[var(--bg-muted)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:300ms]" />
                    </div>
                  ) : (
                    <div
                      className={`max-w-[90%] px-3 py-2 rounded-[12px] text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#334155] text-white whitespace-pre-wrap'
                          : 'bg-[var(--bg-muted)] text-[var(--text-primary)]'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <p className="text-[14px] font-semibold mt-2 mb-1 first:mt-0">{children}</p>,
                            h2: ({ children }) => <p className="text-[13px] font-semibold mt-2 mb-1 first:mt-0">{children}</p>,
                            h3: ({ children }) => <p className="text-[13px] font-medium mt-1.5 mb-0.5 first:mt-0">{children}</p>,
                            p:  ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            code: ({ children, className }) => className
                              ? <code className="block bg-[var(--bg)] rounded px-2 py-1 text-[12px] font-mono my-1 whitespace-pre-wrap">{children}</code>
                              : <code className="bg-[var(--bg)] rounded px-1 text-[12px] font-mono">{children}</code>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-[var(--border-strong)] pl-3 my-1 text-[var(--text-secondary)]">{children}</blockquote>,
                            hr: () => <hr className="my-2 border-[var(--border)]" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}

                  {msg.role === 'user' && !streaming && i === lastUserIdx && (
                    <button
                      onClick={() => editMessage(i)}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--brand)] transition-colors duration-[150ms]"
                    >
                      <IconPencil size={11} />
                      Edit
                    </button>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="flex flex-col gap-1 items-start">
                  <div className="px-3 py-3 rounded-[12px] bg-[var(--bg-muted)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-[var(--border)]">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              disabled={streaming || !projectId}
              placeholder={!projectId ? 'Open a project to use the assistant' : 'Ask a question...'}
              className="flex-1 resize-none rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[#334155]/30 focus:border-[#334155] disabled:opacity-50"
            />
            <div className="flex items-center gap-1.5 pb-[1px]">
              <button
                title="Voice input"
                className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <IconMicrophone size={16} />
              </button>
              {streaming ? (
                <button
                  onClick={stopStreaming}
                  title="Stop"
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white transition-colors hover:opacity-90"
                  style={{ background: '#E24B4A' }}
                >
                  <IconPlayerStop size={15} />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || !projectId}
                  title="Send"
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors hover:bg-[#1E293B]"
                  style={{ background: '#334155' }}
                >
                  <IconArrowUp size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
