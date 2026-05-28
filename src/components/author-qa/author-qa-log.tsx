'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { IconPlus, IconChevronDown, IconChevronUp, IconDownload } from '@tabler/icons-react'
import type { AuthorQuestionRow } from '@/types/database'

type Filter = 'all' | 'pending' | 'sent' | 'answered' | 'resolved'

interface Props {
  projectId: string
  initialQuestions: AuthorQuestionRow[]
}

export function AuthorQALog({ projectId, initialQuestions }: Props) {
  const { fetch: apiFetch } = useApi()
  const [questions, setQuestions] = useState(initialQuestions)
  const [filter, setFilter] = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newNote, setNewNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [responseText, setResponseText] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const filtered = questions.filter((q) => filter === 'all' || q.status === filter)

  const counts: Record<Filter, number> = {
    all: questions.length,
    pending: questions.filter((q) => q.status === 'pending').length,
    sent: questions.filter((q) => q.status === 'sent').length,
    answered: questions.filter((q) => q.status === 'answered').length,
    resolved: questions.filter((q) => q.status === 'resolved').length,
  }

  const createQuestion = async () => {
    if (!newQuestion.trim()) return
    setCreating(true)
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/author-questions`, {
        method: 'POST',
        body: JSON.stringify({
          question_text: newQuestion.trim(),
          translator_note: newNote.trim() || undefined,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setQuestions((prev) => [json.data as AuthorQuestionRow, ...prev])
        setNewQuestion('')
        setNewNote('')
        setShowNewForm(false)
      }
    } finally {
      setCreating(false)
    }
  }

  const patchQuestion = async (questionId: string, updates: Record<string, unknown>) => {
    setSaving(questionId)
    try {
      const res = await apiFetch(
        `/api/v1/projects/${projectId}/author-questions/${questionId}`,
        { method: 'PATCH', body: JSON.stringify(updates) }
      )
      if (res.ok) {
        const json = await res.json()
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? json.data : q)))
      }
    } finally {
      setSaving(null)
    }
  }

  const saveResponse = (questionId: string) => {
    const text = responseText[questionId]?.trim()
    if (!text) return
    patchQuestion(questionId, { author_response: text })
  }

  const exportBrief = async () => {
    setExporting(true)
    try {
      const res = await apiFetch(
        `/api/v1/projects/${projectId}/author-questions/export-brief`
      )
      if (res.ok) {
        const json = await res.json()
        const text = json.data.formatted_text as string
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'author-brief.txt'
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1">
          {(['all', 'pending', 'sent', 'answered', 'resolved'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors duration-quick capitalize ${
                filter === f
                  ? 'bg-brand text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {f} <span className={filter === f ? 'opacity-80' : 'opacity-60'}>({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={exportBrief} loading={exporting}>
            <IconDownload size={14} />
            Export Brief
          </Button>
          <Button size="sm" onClick={() => setShowNewForm((v) => !v)}>
            <IconPlus size={14} />
            New Question
          </Button>
        </div>
      </div>

      {/* New question form */}
      {showNewForm && (
        <div className="bg-[var(--bg)] rounded-card border border-brand/40 p-4 mb-4">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="What question do you want to ask the author?"
            rows={3}
            autoFocus
            className="w-full px-3 py-2 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-[var(--text-tertiary)] resize-none mb-3"
          />
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Private translator note (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-[var(--text-tertiary)] resize-none mb-3"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={createQuestion}
              loading={creating}
              disabled={!newQuestion.trim() || creating}
            >
              Add Question
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Question list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-[var(--bg)] rounded-card border border-[var(--border)]">
          <p className="text-[14px] text-[var(--text-secondary)]">
            {questions.length === 0 ? 'No questions yet.' : `No ${filter} questions.`}
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Track questions for the author and record their responses.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((q) => {
            const isExpanded = expandedId === q.id
            return (
              <div
                key={q.id}
                className="bg-[var(--bg)] rounded-card border border-[var(--border)] overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-[var(--bg-subtle)] transition-colors duration-quick"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                      {q.question_text}
                    </p>
                    {q.translator_note && (
                      <p className="text-[12px] text-[var(--text-tertiary)] mt-1 italic">
                        {q.translator_note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={q.status} />
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {new Date(q.created_at).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <IconChevronUp size={14} className="text-[var(--text-tertiary)]" />
                    ) : (
                      <IconChevronDown size={14} className="text-[var(--text-tertiary)]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-5 py-4">
                    {q.author_response ? (
                      <div className="mb-4 p-3 bg-success/[0.05] border border-success/20 rounded-card">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-success mb-1.5">
                          Author Response
                        </p>
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                          {q.author_response}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5">
                          Record Author Response
                        </p>
                        <textarea
                          value={responseText[q.id] ?? ''}
                          onChange={(e) =>
                            setResponseText((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Enter the author's response..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-[var(--text-tertiary)] resize-none"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {!q.author_response && (
                        <Button
                          size="sm"
                          onClick={() => saveResponse(q.id)}
                          disabled={!responseText[q.id]?.trim() || saving === q.id}
                          loading={saving === q.id}
                        >
                          Save Response
                        </Button>
                      )}
                      {q.status !== 'sent' && q.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchQuestion(q.id, { status: 'sent' })}
                          disabled={saving === q.id}
                          loading={saving === q.id}
                        >
                          Mark Sent
                        </Button>
                      )}
                      {q.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchQuestion(q.id, { status: 'resolved' })}
                          disabled={saving === q.id}
                          loading={saving === q.id}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
