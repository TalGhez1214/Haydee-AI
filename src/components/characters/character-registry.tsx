'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { IconCheck } from '@tabler/icons-react'
import type { CharacterRow } from '@/types/database'

const ROLE_ORDER: Record<CharacterRow['role'], number> = {
  protagonist: 0,
  narrator: 1,
  secondary: 2,
  minor: 3,
}

const ROLE_LABELS: Record<CharacterRow['role'], string> = {
  protagonist: 'Protagonist',
  narrator: 'Narrator',
  secondary: 'Secondary',
  minor: 'Minor',
}

interface Props {
  projectId: string
  targetLanguage: string
  initialCharacters: CharacterRow[]
  initialSelectedId?: string
}

export function CharacterRegistry({ projectId, targetLanguage, initialCharacters, initialSelectedId }: Props) {
  const { fetch: apiFetch } = useApi()
  const router = useRouter()
  const [characters, setCharacters] = useState(() =>
    [...initialCharacters].sort((a, b) => (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4))
  )

  const getInitial = () => {
    const sorted = [...initialCharacters].sort((a, b) => (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4))
    return (initialSelectedId ? sorted.find((c) => c.id === initialSelectedId) : null) ?? sorted[0] ?? null
  }

  const [selected, setSelected] = useState<CharacterRow | null>(getInitial)
  const [targetName, setTargetName] = useState(() => getInitial()?.confirmed_target_name ?? '')
  const [note, setNote] = useState(() => getInitial()?.translator_note ?? '')
  const [role, setRole] = useState<CharacterRow['role']>(() => getInitial()?.role ?? 'secondary')
  const [saving, setSaving] = useState(false)

  const selectChar = useCallback((char: CharacterRow) => {
    setSelected(char)
    setTargetName(char.confirmed_target_name ?? '')
    setNote(char.translator_note ?? '')
    setRole(char.role)
    router.replace(`?char=${char.id}`, { scroll: false })
  }, [router])

  const save = async (confirmed: boolean) => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/characters/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          confirmed_target_name: targetName || null,
          translator_note: note || null,
          role,
          confirmed,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const updated = json.data as CharacterRow
        setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setSelected(updated)
        router.replace(`?char=${updated.id}`, { scroll: false })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-5 overflow-hidden" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* Left: character list */}
      <div className="w-64 flex-shrink-0 bg-[var(--bg)] rounded-card border border-[var(--border)] overflow-y-auto scrollbar-thin">
        {characters.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[13px] text-[var(--text-secondary)]">No characters yet.</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              Upload a manuscript to extract characters automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => selectChar(char)}
                className={`w-full text-left px-4 py-3 transition-colors duration-quick border-l-2 ${
                  selected?.id === char.id
                    ? 'bg-brand/[0.06] border-l-brand'
                    : 'border-l-transparent hover:bg-[var(--bg-muted)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {char.name}
                  </span>
                  {char.confirmed && (
                    <IconCheck size={12} className="text-success flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {ROLE_LABELS[char.role]}
                  </span>
                  {char.tone_tags.length > 0 && (
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                      · {char.tone_tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: character detail */}
      {selected ? (
        <div className="flex-1 bg-[var(--bg)] rounded-card border border-[var(--border)] overflow-y-auto scrollbar-thin p-6">
          <div className="max-w-lg">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                  {selected.name}
                </h2>
                {selected.name_variants.length > 0 && (
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                    Also: {selected.name_variants.join(', ')}
                  </p>
                )}
              </div>
              {selected.confirmed && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success text-[11px] font-medium rounded-full">
                  <IconCheck size={11} />
                  Confirmed
                </span>
              )}
            </div>

            {/* Role */}
            <div className="mb-5">
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5 block">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CharacterRow['role'])}
                className="w-full h-9 px-3 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="protagonist">Protagonist</option>
                <option value="narrator">Narrator</option>
                <option value="secondary">Secondary</option>
                <option value="minor">Minor</option>
              </select>
            </div>

            {/* Tone tags */}
            {selected.tone_tags.length > 0 && (
              <div className="mb-5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5 block">
                  Voice Profile
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tone_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-brand/[0.08] text-brand text-[12px] rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed translation */}
            <div className="mb-4">
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5 block">
                Confirmed Translation
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder={`How will you render "${selected.name}" in ${targetLanguage}?`}
                className="w-full h-9 px-3 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            {/* Translator notes */}
            <div className="mb-6">
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5 block">
                Translator Notes
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Voice notes, register decisions, context..."
                rows={3}
                className="w-full px-3 py-2 rounded-input border border-[var(--border)] bg-[var(--bg)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-[var(--text-tertiary)] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => save(true)} loading={saving} disabled={saving}>
                {selected.confirmed ? 'Update' : 'Confirm Character'}
              </Button>
              {!selected.confirmed && (
                <Button
                  variant="ghost"
                  onClick={() => save(false)}
                  loading={saving}
                  disabled={saving}
                >
                  Save Draft
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg)] rounded-card border border-[var(--border)]">
          <p className="text-[13px] text-[var(--text-tertiary)]">
            Select a character to view details.
          </p>
        </div>
      )}
    </div>
  )
}
