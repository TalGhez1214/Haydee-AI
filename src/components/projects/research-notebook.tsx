'use client'

import { useState } from 'react'
import { IconPlus, IconTrash, IconBookmark, IconX, IconEdit, IconCheck } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useApi } from '@/hooks/use-api'
import type { ResearchNoteRow, Bookmark } from '@/types/database'

interface Props {
  projectId: string
  initialNotes: ResearchNoteRow[]
}

type Category = ResearchNoteRow['category']

const CATEGORY_LABELS: Record<Category, string> = {
  research: 'Research',
  preface_draft: 'Preface Draft',
  reference: 'Reference',
  bookmark: 'Bookmark',
}

const CATEGORY_BADGE: Record<Category, 'research' | 'preface_draft' | 'reference' | 'bookmark_cat'> = {
  research: 'research',
  preface_draft: 'preface_draft',
  reference: 'reference',
  bookmark: 'bookmark_cat',
}

const BLANK_NOTE = (): Partial<ResearchNoteRow> => ({
  title: '',
  content: '',
  category: 'research',
  tags: [],
  linked_chapter: null,
  linked_character: null,
  bookmarks: [],
})

export function ResearchNotebook({ projectId, initialNotes }: Props) {
  const { fetch: apiFetch } = useApi()
  const [notes, setNotes] = useState<ResearchNoteRow[]>(initialNotes)
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all')
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<ResearchNoteRow>>(BLANK_NOTE())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Bookmark form state
  const [newBmUrl, setNewBmUrl] = useState('')
  const [newBmTitle, setNewBmTitle] = useState('')
  const [newBmDesc, setNewBmDesc] = useState('')
  const [showBmForm, setShowBmForm] = useState(false)

  // Tag input
  const [tagInput, setTagInput] = useState('')

  const filtered = notes.filter(
    (n) => categoryFilter === 'all' || n.category === categoryFilter
  )

  const selected = notes.find((n) => n.id === selectedId) ?? null

  function startNew() {
    const blank = BLANK_NOTE()
    setDraft(blank)
    setSelectedId(null)
    setEditing(true)
    setIsNew(true)
  }

  function startEdit(note: ResearchNoteRow) {
    setDraft({ ...note, bookmarks: [...note.bookmarks] })
    setSelectedId(note.id)
    setEditing(true)
    setIsNew(false)
  }

  async function saveNote() {
    if (!draft.title?.trim()) return
    setSaving(true)

    if (isNew) {
      const res = await apiFetch(`/api/v1/projects/${projectId}/research-notes`, {
        method: 'POST',
        body: JSON.stringify(draft),
      })
      if (res.ok) {
        const json = await res.json()
        setNotes((prev) => [json.data, ...prev])
        setSelectedId(json.data.id)
        setEditing(false)
        setIsNew(false)
      }
    } else if (selectedId) {
      const res = await apiFetch(`/api/v1/projects/${projectId}/research-notes/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      })
      if (res.ok) {
        const json = await res.json()
        setNotes((prev) => prev.map((n) => (n.id === selectedId ? json.data : n)))
        setEditing(false)
      }
    }
    setSaving(false)
  }

  async function deleteNote(id: string) {
    setDeleting(true)
    await apiFetch(`/api/v1/projects/${projectId}/research-notes/${id}`, { method: 'DELETE' })
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedId === id) {
      const remaining = notes.filter((n) => n.id !== id)
      setSelectedId(remaining[0]?.id ?? null)
    }
    setEditing(false)
    setDeleting(false)
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !draft.tags?.includes(tag)) {
      setDraft((d) => ({ ...d, tags: [...(d.tags ?? []), tag] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setDraft((d) => ({ ...d, tags: (d.tags ?? []).filter((t) => t !== tag) }))
  }

  function addBookmark() {
    if (!newBmUrl || !newBmTitle) return
    const bm: Bookmark = { url: newBmUrl, title: newBmTitle, description: newBmDesc || null }
    setDraft((d) => ({ ...d, bookmarks: [...(d.bookmarks ?? []), bm] }))
    setNewBmUrl('')
    setNewBmTitle('')
    setNewBmDesc('')
    setShowBmForm(false)
  }

  function removeBookmark(idx: number) {
    setDraft((d) => ({ ...d, bookmarks: (d.bookmarks ?? []).filter((_, i) => i !== idx) }))
  }

  const displayNote = editing ? null : selected

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* Left panel — note list */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-2">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1 mb-1">
          {(['all', 'research', 'preface_draft', 'reference', 'bookmark'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-2.5 py-1 rounded-btn text-[12px] font-medium transition-colors duration-quick ${
                categoryFilter === c
                  ? 'bg-brand text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {c === 'all' ? 'All' : CATEGORY_LABELS[c as Category]}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={startNew} className="w-full">
          <IconPlus size={14} />
          New Note
        </Button>

        {/* Note rows */}
        <div className="space-y-1 overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <p className="text-[13px] text-[var(--text-tertiary)] text-center py-4">No notes yet.</p>
          )}
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => { setSelectedId(note.id); setEditing(false) }}
              className={`w-full text-left px-3 py-2.5 rounded-card border transition-colors duration-quick ${
                selectedId === note.id && !editing
                  ? 'border-brand/40 bg-brand/5 border-l-2 border-l-brand'
                  : 'border-[var(--border)] hover:border-brand/20 bg-[var(--bg)]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge variant={CATEGORY_BADGE[note.category]} />
              </div>
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{note.title}</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — viewer or editor */}
      <div className="flex-1 bg-[var(--bg)] rounded-card border border-[var(--border)] flex flex-col overflow-hidden">
        {/* No note selected */}
        {!displayNote && !editing && (
          <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-[14px]">
            Select a note or create a new one.
          </div>
        )}

        {/* View mode */}
        {displayNote && !editing && (
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{displayNote.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={CATEGORY_BADGE[displayNote.category]} />
                  {displayNote.tags.map((tag) => (
                    <span key={tag} className="text-[11px] bg-[var(--bg-muted)] text-[var(--text-secondary)] rounded px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                  {displayNote.linked_chapter && (
                    <span className="text-[12px] text-[var(--text-tertiary)]">Ch. {displayNote.linked_chapter}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => startEdit(displayNote)}>
                  <IconEdit size={14} />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleting}
                  onClick={() => deleteNote(displayNote.id)}
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {displayNote.content ? (
                <pre className="text-[14px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-sans">
                  {displayNote.content}
                </pre>
              ) : (
                <p className="text-[var(--text-tertiary)] text-[14px]">No content yet.</p>
              )}

              {displayNote.bookmarks.length > 0 && (
                <div className="mt-6 border-t border-[var(--border)] pt-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Bookmarks</p>
                  <div className="space-y-2">
                    {displayNote.bookmarks.map((bm, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <IconBookmark size={14} className="text-warning mt-0.5 flex-shrink-0" />
                        <div>
                          <a
                            href={bm.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-brand hover:underline font-medium"
                          >
                            {bm.title}
                          </a>
                          {bm.description && (
                            <p className="text-[12px] text-[var(--text-secondary)]">{bm.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit / Create mode */}
        {editing && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <span className="text-[14px] font-medium text-[var(--text-primary)]">
                {isNew ? 'New Note' : 'Edit Note'}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditing(false); setIsNew(false) }}
                >
                  Cancel
                </Button>
                <Button size="sm" loading={saving} onClick={saveNote}>
                  <IconCheck size={14} />
                  Save
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Input
                label="Title"
                value={draft.title ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Note title"
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Category"
                  value={draft.category ?? 'research'}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Category }))}
                  options={[
                    { value: 'research', label: 'Research' },
                    { value: 'preface_draft', label: 'Preface Draft' },
                    { value: 'reference', label: 'Reference' },
                    { value: 'bookmark', label: 'Bookmark' },
                  ]}
                />
                <Input
                  label="Chapter (optional)"
                  type="number"
                  value={draft.linked_chapter?.toString() ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      linked_chapter: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 3"
                />
              </div>

              <Textarea
                label="Content"
                value={draft.content ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder="Write your notes here..."
                rows={10}
              />

              {/* Tags */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] block mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(draft.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[12px] bg-[var(--bg-muted)] text-[var(--text-secondary)] rounded px-2 py-0.5"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-danger">
                        <IconX size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag() }
                    }}
                    placeholder="Add tag and press Enter"
                    className="flex-1 h-8 rounded-input border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                  <Button variant="ghost" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>

              {/* Bookmarks */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] block mb-1.5">
                  Bookmarks
                </label>
                {(draft.bookmarks ?? []).length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {(draft.bookmarks ?? []).map((bm, i) => (
                      <div key={i} className="flex items-center gap-2 text-[13px] bg-[var(--bg-subtle)] rounded px-3 py-2">
                        <IconBookmark size={13} className="text-warning flex-shrink-0" />
                        <span className="flex-1 truncate">{bm.title}</span>
                        <button onClick={() => removeBookmark(i)} className="text-[var(--text-tertiary)] hover:text-danger">
                          <IconTrash size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {showBmForm ? (
                  <div className="border border-[var(--border)] rounded-card p-3 space-y-2">
                    <Input
                      label="URL"
                      value={newBmUrl}
                      onChange={(e) => setNewBmUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <Input
                      label="Title"
                      value={newBmTitle}
                      onChange={(e) => setNewBmTitle(e.target.value)}
                      placeholder="Link title"
                    />
                    <Input
                      label="Description (optional)"
                      value={newBmDesc}
                      onChange={(e) => setNewBmDesc(e.target.value)}
                      placeholder="Brief description"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowBmForm(false)}>Cancel</Button>
                      <Button size="sm" onClick={addBookmark}>Add</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setShowBmForm(true)}>
                    <IconPlus size={13} />
                    Add Bookmark
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
