'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import type { FlagRow } from '@/types/database'

type SeverityFilter = 'all' | 'high' | 'medium' | 'low'
type Suggestion = { approach: string; text: string }

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

interface Props {
  projectId: string
  initialFlags: FlagRow[]
}

export function CultureQueue({ projectId, initialFlags }: Props) {
  const { fetch: apiFetch } = useApi()
  const [flags, setFlags] = useState(() =>
    [...initialFlags].sort(
      (a, b) => (SEVERITY_ORDER[a.severity ?? ''] ?? 3) - (SEVERITY_ORDER[b.severity ?? ''] ?? 3)
    )
  )
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedApproach, setSelectedApproach] = useState<Record<string, number>>({})
  const [customDecision, setCustomDecision] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const totalOpen = flags.filter((f) => f.status === 'open').length
  const resolvedCount = flags.length - totalOpen

  const filtered = flags.filter(
    (f) =>
      f.status === 'open' && (severityFilter === 'all' || f.severity === severityFilter)
  )

  const resolve = async (flagId: string, status: 'resolved' | 'dismissed') => {
    const flag = flags.find((f) => f.id === flagId)
    if (!flag) return

    const suggestions = Array.isArray(flag.suggestions) ? (flag.suggestions as Suggestion[]) : []
    const approachIdx = selectedApproach[flagId] ?? 0
    const isCustom = approachIdx === suggestions.length
    const s = suggestions[approachIdx]
    const decision = isCustom
      ? customDecision[flagId]
      : s ? `${s.approach}: ${s.text}` : undefined

    setSaving(flagId)
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/flags/${flagId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(decision ? { translator_decision: decision } : {}),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setFlags((prev) => prev.map((f) => (f.id === flagId ? json.data : f)))
        setExpandedId(null)
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      {/* Progress bar + severity filters */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">{resolvedCount}</span> of{' '}
            <span className="font-medium text-[var(--text-primary)]">{flags.length}</span> resolved
          </span>
          {flags.length > 0 && (
            <div className="h-1.5 w-32 bg-[var(--bg-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${(resolvedCount / flags.length) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'high', 'medium', 'low'] as SeverityFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors duration-quick capitalize ${
                severityFilter === s
                  ? 'bg-brand text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Flag list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-[var(--bg)] rounded-card border border-[var(--border)]">
          <p className="text-[14px] text-[var(--text-secondary)]">
            {totalOpen === 0
              ? 'All culture flags resolved.'
              : `No ${severityFilter === 'all' ? '' : severityFilter + '-severity '}open flags.`}
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Upload a manuscript to detect culturally non-portable passages.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((flag) => {
            const suggestions = Array.isArray(flag.suggestions)
              ? (flag.suggestions as Suggestion[])
              : []
            const isExpanded = expandedId === flag.id
            const approachIdx = selectedApproach[flag.id] ?? 0
            const isCustom = approachIdx === suggestions.length

            return (
              <div
                key={flag.id}
                className="bg-[var(--bg)] rounded-card border border-[var(--border)] overflow-hidden"
              >
                {/* Collapsed header */}
                <button
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-[var(--bg-subtle)] transition-colors duration-quick"
                  onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {flag.severity && <Badge variant={flag.severity} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {flag.passage && (
                      <p className="text-[13px] text-[var(--text-primary)] italic mb-1 line-clamp-2">
                        &ldquo;{flag.passage}&rdquo;
                      </p>
                    )}
                    {flag.explanation && (
                      <p className="text-[12px] text-[var(--text-secondary)] line-clamp-1">
                        {flag.explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-[var(--text-tertiary)] mt-0.5">
                    {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-5 py-4">
                    {flag.passage && (
                      <div className="bg-[var(--bg-subtle)] rounded-card p-3 mb-4 border border-[var(--border)]">
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed italic">
                          &ldquo;{flag.passage}&rdquo;
                        </p>
                      </div>
                    )}

                    {flag.explanation && (
                      <p className="text-[13px] text-[var(--text-primary)] mb-4 leading-relaxed">
                        {flag.explanation}
                      </p>
                    )}

                    {suggestions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                          Suggested Approaches
                        </p>
                        <div className="flex flex-col gap-2">
                          {suggestions.map((suggestion, i) => (
                            <label key={i} className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`approach-${flag.id}`}
                                checked={approachIdx === i}
                                onChange={() =>
                                  setSelectedApproach((prev) => ({ ...prev, [flag.id]: i }))
                                }
                                className="mt-0.5 accent-brand flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">
                                  {suggestion.approach}
                                </p>
                                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                                  {suggestion.text}
                                </p>
                              </div>
                            </label>
                          ))}
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`approach-${flag.id}`}
                              checked={isCustom}
                              onChange={() =>
                                setSelectedApproach((prev) => ({
                                  ...prev,
                                  [flag.id]: suggestions.length,
                                }))
                              }
                              className="mt-0.5 accent-brand flex-shrink-0"
                            />
                            <span className="text-[13px] text-[var(--text-secondary)]">
                              Custom approach
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {(suggestions.length === 0 || isCustom) && (
                      <div className="mb-4">
                        <textarea
                          value={customDecision[flag.id] ?? ''}
                          onChange={(e) =>
                            setCustomDecision((prev) => ({ ...prev, [flag.id]: e.target.value }))
                          }
                          placeholder="Describe your approach..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-[var(--text-tertiary)] resize-none"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => resolve(flag.id, 'resolved')}
                        loading={saving === flag.id}
                        disabled={saving === flag.id}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resolve(flag.id, 'dismissed')}
                        loading={saving === flag.id}
                        disabled={saving === flag.id}
                      >
                        Dismiss
                      </Button>
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
