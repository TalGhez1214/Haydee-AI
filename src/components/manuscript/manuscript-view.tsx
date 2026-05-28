'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useApi } from '@/hooks/use-api'
import { IconSparkles, IconX, IconCopy, IconCheck } from '@tabler/icons-react'
import type { ChunkRow, FlagRow, CharacterRow, GlossaryTermRow } from '@/types/database'

interface ChapterSummary {
  id: string
  chapter_number: number
  chapter_title: string | null
  word_count: number | null
  translated_at: string | null
  flag_counts: { open: number; total: number }
}

interface Props {
  projectId: string
  chapters: ChapterSummary[]
  sourceLanguage: string
  targetLanguage: string
}

type ContextTab = 'flags' | 'glossary' | 'characters'
type Suggestion = { approach: string; text: string }

// ---- Selection tooltip state ----
interface SelectionTooltip {
  text: string
  x: number
  y: number
}

// ---- Translate request state ----
interface TranslateRequest {
  requestId: string
  status: 'pending' | 'done' | 'error'
  result: string | null
  tooltipX: number
  tooltipY: number
}

// ---- Helpers ----

function splitWithOffsets(text: string): { text: string; offset: number }[] {
  const result: { text: string; offset: number }[] = []
  const regex = /\n\n+/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const para = text.slice(lastIndex, match.index)
    if (para.trim()) result.push({ text: para, offset: lastIndex })
    lastIndex = match.index + match[0].length
  }
  const remaining = text.slice(lastIndex)
  if (remaining.trim()) result.push({ text: remaining, offset: lastIndex })
  return result
}

function buildHighlights(
  text: string,
  flags: FlagRow[]
): { start: number; end: number; flag: FlagRow }[] {
  const positions: { start: number; end: number; flag: FlagRow }[] = []
  for (const flag of flags) {
    if (!flag.passage || flag.status !== 'open') continue
    const idx = text.indexOf(flag.passage)
    if (idx === -1) continue
    positions.push({ start: idx, end: idx + flag.passage.length, flag })
  }
  positions.sort((a, b) => a.start - b.start)
  const clean: typeof positions = []
  let lastEnd = 0
  for (const p of positions) {
    if (p.start >= lastEnd) {
      clean.push(p)
      lastEnd = p.end
    }
  }
  return clean
}

interface ParagraphProps {
  para: { text: string; offset: number }
  highlights: { start: number; end: number; flag: FlagRow }[]
  onFlagClick: (flag: FlagRow) => void
  selectedFlagId: string | null
}

function Paragraph({ para, highlights, onFlagClick, selectedFlagId }: ParagraphProps) {
  const paraEnd = para.offset + para.text.length
  const paraHighlights = highlights.filter((h) => h.start < paraEnd && h.end > para.offset)
  const nodes: React.ReactNode[] = []
  let pos = 0

  for (const h of paraHighlights) {
    const localStart = Math.max(0, h.start - para.offset)
    const localEnd = Math.min(para.text.length, h.end - para.offset)
    if (pos < localStart) {
      nodes.push(<span key={`t-${pos}`}>{para.text.slice(pos, localStart)}</span>)
    }
    nodes.push(
      <span
        key={`f-${h.flag.id}`}
        className={`flag-${h.flag.flag_type} cursor-pointer ${
          selectedFlagId === h.flag.id ? 'ring-1 ring-offset-1 ring-current' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onFlagClick(h.flag)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onFlagClick(h.flag)}
      >
        {para.text.slice(localStart, localEnd)}
      </span>
    )
    pos = localEnd
  }
  if (pos < para.text.length) {
    nodes.push(<span key="t-end">{para.text.slice(pos)}</span>)
  }
  return <p className="text-[15px] leading-loose text-[var(--text-primary)]">{nodes}</p>
}

// ---- Main component ----

export function ManuscriptView({ projectId, chapters, sourceLanguage, targetLanguage }: Props) {
  const { fetch: apiFetch } = useApi()

  const [selectedChapterNum, setSelectedChapterNum] = useState<number | null>(
    chapters[0]?.chapter_number ?? null
  )
  const [chunkData, setChunkData] = useState<{ chunk: ChunkRow; flags: FlagRow[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const [translationMap, setTranslationMap] = useState<Record<string, string>>({})
  const [focusedParaIdx, setFocusedParaIdx] = useState<number | null>(null)

  const [contextTab, setContextTab] = useState<ContextTab>('flags')
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTermRow[]>([])
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null)

  // Selection tooltip — shown when user highlights text in source panel
  const [selectionTooltip, setSelectionTooltip] = useState<SelectionTooltip | null>(null)
  // In-flight / completed translate request
  const [translateRequest, setTranslateRequest] = useState<TranslateRequest | null>(null)
  // Copy confirmation flash
  const [copied, setCopied] = useState(false)

  const [isTranslated, setIsTranslated] = useState(false)
  const [togglingTranslated, setTogglingTranslated] = useState(false)

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translationMapRef = useRef<Record<string, string>>({})
  const sourceRef = useRef<HTMLDivElement>(null)

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const saveDraft = useCallback(
    async (chapterNum: number) => {
      const prefix = `${chapterNum}-`
      const draft: Record<string, string> = {}
      for (const [k, v] of Object.entries(translationMapRef.current)) {
        if (k.startsWith(prefix)) draft[k.slice(prefix.length)] = v
      }
      setSaveState('saving')
      try {
        await apiFetch(`/api/v1/projects/${projectId}/chapters/${chapterNum}`, {
          method: 'PATCH',
          body: JSON.stringify({ draft_translation: draft }),
        })
        setSaveState('saved')
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000)
      } catch {
        setSaveState('idle')
      }
    },
    [apiFetch, projectId]
  )

  const loadChapter = useCallback(
    async (num: number) => {
      setLoading(true)
      setSelectedFlagId(null)
      setFocusedParaIdx(null)
      try {
        const res = await apiFetch(`/api/v1/projects/${projectId}/chapters/${num}`)
        if (res.ok) {
          const json = await res.json()
          setChunkData(json.data)
          setIsTranslated(!!json.data.chunk.translated_at)
          // Restore saved draft into translation map
          const draft = json.data.chunk.draft_translation as Record<string, string> | null
          if (draft) {
            setTranslationMap((prev) => {
              const next = { ...prev }
              for (const [idx, text] of Object.entries(draft)) {
                next[`${num}-${idx}`] = text
              }
              return next
            })
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [apiFetch, projectId]
  )

  useEffect(() => {
    void Promise.all([
      apiFetch(`/api/v1/projects/${projectId}/glossary`).then((r) =>
        r.ok ? r.json().then((j) => setGlossaryTerms(j.data ?? [])) : null
      ),
      apiFetch(`/api/v1/projects/${projectId}/characters`).then((r) =>
        r.ok ? r.json().then((j) => setCharacters(j.data ?? [])) : null
      ),
    ])
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedChapterNum !== null) loadChapter(selectedChapterNum)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref in sync so the debounce callback always sees latest values
  useEffect(() => {
    translationMapRef.current = translationMap
  }, [translationMap])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const selectChapter = (num: number) => {
    // Flush any pending auto-save for the current chapter before switching
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      if (selectedChapterNum !== null) void saveDraft(selectedChapterNum)
    }
    setSelectedChapterNum(num)
    loadChapter(num)
  }

  const onFlagClick = (flag: FlagRow) => {
    setSelectedFlagId(flag.id)
    setContextTab('flags')
  }

  const getTranslation = (paraIdx: number) =>
    translationMap[`${selectedChapterNum}-${paraIdx}`] ?? ''

  const setTranslation = (paraIdx: number, value: string) => {
    const chapterNum = selectedChapterNum
    setTranslationMap((prev) => ({ ...prev, [`${chapterNum}-${paraIdx}`]: value }))
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (chapterNum !== null) void saveDraft(chapterNum)
    }, 1500)
  }

  const toggleTranslated = async () => {
    if (!selectedChapterNum || togglingTranslated) return
    const newVal = !isTranslated
    setIsTranslated(newVal)
    setTogglingTranslated(true)
    try {
      await apiFetch(`/api/v1/projects/${projectId}/chapters/${selectedChapterNum}`, {
        method: 'PATCH',
        body: JSON.stringify({ mark_translated: newVal }),
      })
    } catch {
      setIsTranslated(!newVal)
    } finally {
      setTogglingTranslated(false)
    }
  }

  const sessionWords = Object.values(translationMap)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  // ---- Selection → tooltip ----

  const handleSourceMouseUp = useCallback(() => {
    // Don't interfere if a translate request is already in flight
    if (translateRequest?.status === 'pending') return

    const sel = window.getSelection()
    const text = sel?.toString().trim() ?? ''
    if (!text || !sel || sel.rangeCount === 0) {
      setSelectionTooltip(null)
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setSelectionTooltip({
      text,
      // Position tooltip just above the selection, centred
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }, [translateRequest])

  // Dismiss tooltip when clicking elsewhere (but not while translating)
  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (translateRequest?.status === 'pending') return
      const target = e.target as HTMLElement
      if (target.closest('[data-translate-tooltip]')) return
      setSelectionTooltip(null)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [translateRequest])

  // ---- Polling ----

  const startPolling = useCallback(
    (requestId: string, tooltipX: number, tooltipY: number) => {
      let attempts = 0
      const MAX = 20

      const poll = async () => {
        if (attempts >= MAX) {
          setTranslateRequest(null)
          return
        }
        attempts++
        try {
          const res = await apiFetch(
            `/api/v1/projects/${projectId}/translate/${requestId}`
          )
          if (res.ok) {
            const json = await res.json()
            const req = json.data as { status: string; result: string | null }
            if (req.status === 'done') {
              setTranslateRequest({ requestId, status: 'done', result: req.result, tooltipX, tooltipY })
              return
            }
            if (req.status === 'error') {
              setTranslateRequest(null)
              return
            }
          }
        } catch {
          // network error — keep polling
        }
        pollRef.current = setTimeout(poll, 1500)
      }

      pollRef.current = setTimeout(poll, 1500)
    },
    [apiFetch, projectId]
  )

  // ---- Trigger translation ----

  const triggerTranslate = useCallback(async () => {
    if (!selectionTooltip) return
    const { text, x, y } = selectionTooltip
    setSelectionTooltip(null)
    setTranslateRequest({ requestId: '', status: 'pending', result: null, tooltipX: x, tooltipY: y })

    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/translate`, {
        method: 'POST',
        body: JSON.stringify({ selected_text: text }),
      })
      if (res.ok) {
        const json = await res.json()
        const requestId: string = json.data.requestId
        setTranslateRequest((prev) => prev ? { ...prev, requestId } : null)
        startPolling(requestId, x, y)
      } else {
        setTranslateRequest(null)
      }
    } catch {
      setTranslateRequest(null)
    }
  }, [selectionTooltip, apiFetch, projectId, startPolling])

  // ---- Copy ----

  const handleCopy = () => {
    if (!translateRequest?.result) return
    navigator.clipboard.writeText(translateRequest.result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const closeModal = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setTranslateRequest(null)
    setCopied(false)
  }

  // ---- Derived ----

  const paragraphs = chunkData ? splitWithOffsets(chunkData.chunk.text) : []
  const highlights = chunkData ? buildHighlights(chunkData.chunk.text, chunkData.flags) : []
  const openFlags = chunkData?.flags.filter((f) => f.status === 'open') ?? []

  const chunkText = chunkData?.chunk.text ?? ''
  const chunkTextLower = chunkText.toLowerCase()
  const relevantTerms = glossaryTerms.filter((t) =>
    chunkTextLower.includes(t.source_term.toLowerCase())
  )
  const relevantChars = characters.filter(
    (c) => chunkText.includes(c.name) || c.name_variants.some((v) => chunkText.includes(v))
  )

  const isTranslating = translateRequest?.status === 'pending'

  return (
    <>
      <div
        className="flex overflow-hidden rounded-card border border-[var(--border)]"
        style={{ height: 'calc(100vh - 56px - 48px)' }}
      >
        {/* ── Chapter nav: w-12 collapsed, hover expands to w-52 ── */}
        <div className="w-11 hover:w-52 transition-all duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)] overflow-hidden flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-subtle)] flex flex-col">
          <div className="flex-shrink-0 px-3 py-3 border-b border-[var(--border)] flex items-center gap-2 overflow-hidden">
            <span className="flex-shrink-0 w-6 flex items-center justify-center text-[var(--text-tertiary)]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] whitespace-nowrap">
              Chapters
            </span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
            {chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChapter(ch.chapter_number)}
                className={`flex items-center gap-2 w-full pl-3 pr-3 py-2.5 transition-colors duration-quick overflow-hidden text-left ${
                  selectedChapterNum === ch.chapter_number
                    ? 'bg-brand/[0.08] text-brand'
                    : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded ${
                    selectedChapterNum === ch.chapter_number
                      ? 'bg-brand text-white'
                      : 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {ch.chapter_number}
                </span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[12px] font-medium whitespace-nowrap truncate">
                    {ch.chapter_title ?? `Chapter ${ch.chapter_number}`}
                  </p>
                  {ch.word_count != null && (
                    <p className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">
                      {ch.word_count.toLocaleString()} words
                    </p>
                  )}
                </div>
                {(ch.chapter_number === selectedChapterNum ? isTranslated : !!ch.translated_at) &&
                  ch.flag_counts.open === 0 && (
                    <IconCheck size={12} className="ml-auto flex-shrink-0 text-success" />
                  )}
                {ch.flag_counts.open > 0 && (
                  <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-warning/20 text-warning text-[9px] font-semibold rounded-full">
                    {ch.flag_counts.open}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main: source | translation ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <div className="h-10 flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-between px-5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              {chunkData
                ? `Chapter ${chunkData.chunk.chapter_number}${
                    chunkData.chunk.chapter_title ? ` — ${chunkData.chunk.chapter_title}` : ''
                  }`
                : 'Select a chapter to begin'}
            </span>
            <span className="flex items-center gap-3 text-[12px] text-[var(--text-tertiary)]">
              {sourceLanguage} → {targetLanguage}
              {sessionWords > 0 && ` · ${sessionWords.toLocaleString()} words this session`}
              {saveState === 'saving' && (
                <span className="flex items-center gap-1">
                  <Spinner size="sm" />
                  Saving…
                </span>
              )}
              {saveState === 'saved' && (
                <span className="flex items-center gap-1 text-success">
                  <IconCheck size={11} />
                  Saved
                </span>
              )}
              {chunkData && (
                <button
                  onClick={toggleTranslated}
                  disabled={togglingTranslated}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors duration-quick disabled:opacity-50 ${
                    isTranslated
                      ? 'bg-success/10 text-success hover:bg-success/20'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isTranslated && <IconCheck size={11} />}
                  {isTranslated ? 'Translated' : 'Mark as translated'}
                </button>
              )}
            </span>
          </div>

          {/* Side-by-side panels */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Source text — selection triggers AI tooltip */}
              <div
                ref={sourceRef}
                className="flex-1 border-r border-[var(--border)] overflow-y-auto scrollbar-thin select-text"
                onMouseUp={handleSourceMouseUp}
              >
                {paragraphs.length > 0 ? (
                  <div className="max-w-[520px] mx-auto px-8 py-8">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-6">
                      Source
                    </p>
                    {paragraphs.map((para, i) => (
                      <div
                        key={i}
                        onClick={() => setFocusedParaIdx(i)}
                        className={`rounded p-2 -mx-2 mb-4 cursor-pointer transition-colors duration-quick ${
                          focusedParaIdx === i
                            ? 'bg-brand/[0.04]'
                            : 'hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <Paragraph
                          para={para}
                          highlights={highlights}
                          onFlagClick={onFlagClick}
                          selectedFlagId={selectedFlagId}
                        />
                      </div>
                    ))}
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-2">
                    <p className="text-[14px] text-[var(--text-secondary)]">
                      No manuscript uploaded yet.
                    </p>
                    <p className="text-[12px] text-[var(--text-tertiary)]">
                      Upload a manuscript from the project overview.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[13px] text-[var(--text-tertiary)]">
                      Select a chapter to begin.
                    </p>
                  </div>
                )}
              </div>

              {/* Translation editor */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {paragraphs.length > 0 && (
                  <div className="max-w-[520px] mx-auto px-8 py-8">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-6">
                      Translation
                    </p>
                    {paragraphs.map((para, i) => (
                      <div
                        key={i}
                        className={`mb-4 rounded-lg transition-all duration-quick ${
                          focusedParaIdx === i
                            ? 'ring-1 ring-brand/20 bg-brand/[0.02] px-2 -mx-2'
                            : ''
                        }`}
                      >
                        <textarea
                          value={getTranslation(i)}
                          onChange={(e) => setTranslation(i, e.target.value)}
                          onFocus={() => setFocusedParaIdx(i)}
                          placeholder="Type your translation…"
                          className="w-full resize-none bg-transparent text-[15px] leading-loose text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-tertiary)] py-2"
                          rows={Math.max(3, Math.ceil(para.text.length / 90))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Context panel ── */}
        <div className="w-64 flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg)] flex flex-col overflow-hidden">
          <div className="flex flex-shrink-0 border-b border-[var(--border)]">
            {(
              [
                ['flags', `Flags${openFlags.length > 0 ? ` (${openFlags.length})` : ''}`],
                [
                  'glossary',
                  `Terms${relevantTerms.length > 0 ? ` (${relevantTerms.length})` : ''}`,
                ],
                ['characters', 'Cast'],
              ] as [ContextTab, string][]
            ).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setContextTab(tab)}
                className={`flex-1 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors duration-quick ${
                  contextTab === tab
                    ? 'text-brand border-b-2 border-brand -mb-px'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {/* Flags */}
            {contextTab === 'flags' &&
              (openFlags.length === 0 ? (
                <p className="text-[12px] text-[var(--text-tertiary)] text-center py-10">
                  {chunkData
                    ? 'No open flags in this chapter.'
                    : 'Select a chapter to see flags.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {openFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`rounded-lg border p-3 cursor-pointer transition-all duration-quick ${
                        selectedFlagId === flag.id
                          ? 'border-brand bg-brand/[0.04]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]'
                      }`}
                      onClick={() =>
                        setSelectedFlagId(selectedFlagId === flag.id ? null : flag.id)
                      }
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge variant={flag.flag_type} />
                        {flag.severity && <Badge variant={flag.severity} />}
                      </div>
                      {flag.passage && (
                        <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed line-clamp-2">
                          &ldquo;{flag.passage}&rdquo;
                        </p>
                      )}
                      {selectedFlagId === flag.id && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          {flag.explanation && (
                            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed mb-2">
                              {flag.explanation}
                            </p>
                          )}
                          {Array.isArray(flag.suggestions) &&
                            (flag.suggestions as Suggestion[]).length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5">
                                  Approaches
                                </p>
                                {(flag.suggestions as Suggestion[]).map((s, i) => (
                                  <div key={i} className="text-[11px] mb-1.5">
                                    <span className="font-medium text-[var(--text-primary)]">
                                      {s.approach}:{' '}
                                    </span>
                                    <span className="text-[var(--text-secondary)]">{s.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

            {/* Glossary terms */}
            {contextTab === 'glossary' &&
              (relevantTerms.length === 0 ? (
                <p className="text-[12px] text-[var(--text-tertiary)] text-center py-10">
                  {chunkData
                    ? 'No glossary terms found in this chapter.'
                    : 'Select a chapter to see relevant terms.'}
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {relevantTerms.map((term) => (
                    <div key={term.id} className="py-2.5 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                            {term.source_term}
                          </p>
                          {term.approved_translation && (
                            <p className="text-[11px] text-success truncate">
                              {term.approved_translation}
                            </p>
                          )}
                          {!term.approved_translation && term.ai_suggestion && (
                            <p className="text-[11px] text-[var(--text-tertiary)] italic truncate">
                              {term.ai_suggestion}
                            </p>
                          )}
                        </div>
                        <Badge variant={term.status} />
                      </div>
                      {term.term_type && (
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                          {term.term_type}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}

            {/* Characters */}
            {contextTab === 'characters' &&
              (relevantChars.length === 0 ? (
                <p className="text-[12px] text-[var(--text-tertiary)] text-center py-10">
                  {chunkData
                    ? 'No characters found in this chapter.'
                    : 'Select a chapter to see characters.'}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {relevantChars.map((char) => (
                    <div
                      key={char.id}
                      className="rounded-lg border border-[var(--border)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[12px] font-medium text-[var(--text-primary)]">
                          {char.name}
                        </p>
                        <span className="text-[10px] text-[var(--text-tertiary)] capitalize">
                          {char.role}
                        </span>
                      </div>
                      {char.confirmed_target_name && (
                        <p className="text-[11px] text-success mb-1.5">
                          → {char.confirmed_target_name}
                        </p>
                      )}
                      {char.tone_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {char.tone_tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-brand/10 text-brand text-[10px] rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {char.translator_note && (
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {char.translator_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── Selection tooltip (fixed, above highlighted text) ── */}
      {selectionTooltip && !translateRequest && (
        <div
          data-translate-tooltip
          style={{
            position: 'fixed',
            top: selectionTooltip.y - 32,
            left: selectionTooltip.x,
            transform: 'translateX(-50%)',
            zIndex: 60,
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-md shadow-lg cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors duration-quick"
          onMouseDown={(e) => e.preventDefault()}
          onClick={triggerTranslate}
        >
          <IconSparkles size={12} className="text-brand" />
          <span className="text-[12px] font-medium text-[var(--text-primary)]">AI translate</span>
        </div>
      )}

      {/* ── Translating indicator (same position as tooltip, while pending) ── */}
      {isTranslating && (
        <div
          style={{
            position: 'fixed',
            top: (translateRequest?.tooltipY ?? 0) - 32,
            left: translateRequest?.tooltipX ?? 0,
            transform: 'translateX(-50%)',
            zIndex: 60,
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-md shadow-lg"
        >
          <Spinner size="sm" />
          <span className="text-[12px] text-[var(--text-secondary)]">Translating…</span>
        </div>
      )}

      {/* ── Result modal ── */}
      {translateRequest?.status === 'done' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-[var(--bg)] rounded-card border border-[var(--border)] shadow-xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-1.5">
                <IconSparkles size={14} className="text-brand" />
                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                  AI Translation
                </span>
              </div>
              <button
                onClick={closeModal}
                className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors duration-quick"
              >
                <IconX size={14} />
              </button>
            </div>

            {/* Translation text */}
            <div className="px-5 py-4">
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {translateRequest.result}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end px-5 pb-4">
              <Button variant="ghost" size="sm" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <IconCheck size={13} />
                    Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={13} />
                    Copy translation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
