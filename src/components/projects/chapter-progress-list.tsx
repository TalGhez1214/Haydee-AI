'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/use-api'
import { IconCheck } from '@tabler/icons-react'
import { Spinner } from '@/components/ui/spinner'

interface Chapter {
  id: string
  chapter_number: number
  chapter_title: string | null
  word_count: number | null
  translated_at: string | null
}

interface Props {
  projectId: string
  chapters: Chapter[]
  totalWords: number
}

export function ChapterProgressList({ projectId, chapters: initialChapters, totalWords }: Props) {
  const { fetch: apiFetch } = useApi()
  const router = useRouter()
  const [chapters, setChapters] = useState(initialChapters)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const translatedWords = chapters.reduce(
    (sum, c) => sum + (c.translated_at ? (c.word_count ?? 0) : 0),
    0
  )
  const translatedCount = chapters.filter((c) => !!c.translated_at).length
  const pct = totalWords > 0 ? Math.min(100, Math.round((translatedWords / totalWords) * 100)) : 0

  const toggleChapter = async (chapter: Chapter) => {
    if (loadingId) return
    setLoadingId(chapter.id)
    const markTranslated = !chapter.translated_at
    try {
      const res = await apiFetch(
        `/api/v1/projects/${projectId}/chapters/${chapter.chapter_number}`,
        { method: 'PATCH', body: JSON.stringify({ mark_translated: markTranslated }) }
      )
      if (res.ok) {
        setChapters((prev) =>
          prev.map((c) =>
            c.id === chapter.id
              ? { ...c, translated_at: markTranslated ? new Date().toISOString() : null }
              : c
          )
        )
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  if (chapters.length === 0) return null

  return (
    <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5 mt-4">
      {/* Header + counts */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-medium text-[var(--text-primary)]">Translation Progress</p>
        <p className="text-[12px] text-[var(--text-tertiary)]">
          {translatedCount} / {chapters.length} chapters · {pct}%
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-brand rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Chapter rows */}
      <div className="divide-y divide-[var(--border)]">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-[var(--text-primary)] truncate">
                {chapter.chapter_number}.{' '}
                {chapter.chapter_title ?? `Chapter ${chapter.chapter_number}`}
              </p>
              {chapter.word_count != null && (
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {chapter.word_count.toLocaleString()} words
                </p>
              )}
            </div>
            <button
              onClick={() => toggleChapter(chapter)}
              disabled={!!loadingId}
              className={`ml-4 flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors duration-quick disabled:opacity-50 ${
                chapter.translated_at
                  ? 'bg-success/10 text-success hover:bg-success/20'
                  : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {loadingId === chapter.id ? (
                <Spinner size="sm" />
              ) : chapter.translated_at ? (
                <>
                  <IconCheck size={12} />
                  Translated
                </>
              ) : (
                'Mark as translated'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
