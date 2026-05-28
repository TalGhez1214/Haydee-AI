'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { IconCheck, IconFlag, IconRefresh } from '@tabler/icons-react'
import type { GlossaryTermRow } from '@/types/database'

type Filter = 'all' | 'pending' | 'approved' | 'flagged'

interface Props {
  projectId: string
  initialTerms: GlossaryTermRow[]
}

export function GlossaryManager({ projectId, initialTerms }: Props) {
  const { fetch: apiFetch } = useApi()
  const [terms, setTerms] = useState(initialTerms)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)

  const filtered = terms.filter((t) => filter === 'all' || t.status === filter)

  const counts = {
    all: terms.length,
    pending: terms.filter((t) => t.status === 'pending').length,
    approved: terms.filter((t) => t.status === 'approved').length,
    flagged: terms.filter((t) => t.status === 'flagged').length,
  }

  const patchTerm = async (termId: string, updates: Record<string, unknown>) => {
    setSaving(termId)
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/glossary/${termId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const json = await res.json()
        setTerms((prev) => prev.map((t) => (t.id === termId ? json.data : t)))
      }
    } finally {
      setSaving(null)
    }
  }

  const approve = (term: GlossaryTermRow) => {
    if (editingId === term.id && editValue.trim()) {
      patchTerm(term.id, { status: 'approved', approved_translation: editValue.trim() })
      setEditingId(null)
      return
    }
    if (term.approved_translation) {
      patchTerm(term.id, { status: 'approved' })
    } else {
      setEditingId(term.id)
      setEditValue(term.ai_suggestion ?? '')
    }
  }

  const commitEdit = (termId: string) => {
    if (editValue.trim()) {
      patchTerm(termId, { approved_translation: editValue.trim() })
    }
    setEditingId(null)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allPendingInView = filtered.filter((t) => t.status === 'pending').map((t) => t.id)
  const allPendingChecked =
    allPendingInView.length > 0 && allPendingInView.every((id) => selected.has(id))

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPendingChecked) {
        allPendingInView.forEach((id) => next.delete(id))
      } else {
        allPendingInView.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const selectedPending = Array.from(selected).filter(
    (id) => terms.find((t) => t.id === id)?.status === 'pending'
  )

  const bulkApprove = async () => {
    if (selectedPending.length === 0) return
    setBulkSaving(true)
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/glossary/bulk-approve`, {
        method: 'POST',
        body: JSON.stringify({ term_ids: Array.from(selectedPending) }),
      })
      if (res.ok) {
        setTerms((prev) =>
          prev.map((t) =>
            selectedPending.includes(t.id) ? { ...t, status: 'approved' as const } : t
          )
        )
        setSelected(new Set())
      }
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <div>
      {/* Filters + bulk actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['all', 'pending', 'approved', 'flagged'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors duration-quick capitalize ${
                filter === f
                  ? 'bg-brand text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {f}{' '}
              <span className={filter === f ? 'opacity-80' : 'opacity-60'}>({counts[f]})</span>
            </button>
          ))}
        </div>
        {selectedPending.length > 0 && (
          <Button size="sm" variant="success" onClick={bulkApprove} loading={bulkSaving}>
            <IconCheck size={13} />
            Approve {selectedPending.length} selected
          </Button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-[var(--bg)] rounded-card border border-[var(--border)]">
          <p className="text-[14px] text-[var(--text-secondary)]">
            No {filter === 'all' ? '' : filter + ' '}terms yet.
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Upload a manuscript to extract terminology candidates automatically.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg)] rounded-card border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPendingChecked}
                    onChange={toggleSelectAll}
                    className="rounded"
                    disabled={allPendingInView.length === 0}
                  />
                </th>
                {[
                  'Term',
                  'Type',
                  'AI Suggestion',
                  'Your Translation',
                  'Freq',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((term) => (
                <tr
                  key={term.id}
                  className="hover:bg-[var(--bg-subtle)] transition-colors duration-quick"
                >
                  <td className="px-4 py-3">
                    {term.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selected.has(term.id)}
                        onChange={() => toggleSelect(term.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      {term.source_term}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-[var(--text-tertiary)]">
                      {term.term_type ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-[var(--text-secondary)] italic">
                      {term.ai_suggestion ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    {editingId === term.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(term.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(term.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="w-full h-7 px-2 rounded border border-brand text-[13px] text-[var(--text-primary)] focus:outline-none bg-[var(--bg)]"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(term.id)
                          setEditValue(term.approved_translation ?? '')
                        }}
                        className="text-[13px] text-[var(--text-primary)] hover:text-brand min-w-[60px] text-left"
                      >
                        {term.approved_translation ?? (
                          <span className="text-[var(--text-tertiary)] italic">Click to set</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[12px] text-[var(--text-tertiary)]">{term.frequency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={term.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {term.status !== 'approved' && (
                        <button
                          onClick={() => approve(term)}
                          disabled={saving === term.id}
                          title="Approve"
                          className="h-7 w-7 flex items-center justify-center rounded text-success hover:bg-success/10 transition-colors duration-quick disabled:opacity-40"
                        >
                          <IconCheck size={14} />
                        </button>
                      )}
                      {term.status !== 'flagged' && (
                        <button
                          onClick={() => patchTerm(term.id, { status: 'flagged' })}
                          disabled={saving === term.id}
                          title="Flag for review"
                          className="h-7 w-7 flex items-center justify-center rounded text-warning hover:bg-warning/10 transition-colors duration-quick disabled:opacity-40"
                        >
                          <IconFlag size={14} />
                        </button>
                      )}
                      {term.status !== 'pending' && (
                        <button
                          onClick={() => patchTerm(term.id, { status: 'pending' })}
                          disabled={saving === term.id}
                          title="Reset to pending"
                          className="h-7 w-7 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] transition-colors duration-quick disabled:opacity-40"
                        >
                          <IconRefresh size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
