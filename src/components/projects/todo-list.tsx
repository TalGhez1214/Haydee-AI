'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconFlag,
  IconUser,
  IconBook,
  IconQuestionMark,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useApi } from '@/hooks/use-api'
import type { ProjectTodoRow } from '@/types/database'

interface Props {
  projectId: string
  initialTodos: ProjectTodoRow[]
}

const LINKED_TYPE_ICONS = {
  flag: IconFlag,
  character: IconUser,
  glossary_term: IconBook,
  author_question: IconQuestionMark,
  none: null,
}

const LINKED_TYPE_LABELS = {
  flag: 'Flag',
  character: 'Character',
  glossary_term: 'Glossary',
  author_question: 'Author Q&A',
  none: 'None',
}

const LINKED_TYPE_HREFS: Record<string, string> = {
  flag: 'culture-queue',
  character: 'characters',
  glossary_term: 'glossary',
  author_question: 'author-qa',
}

export function TodoList({ projectId, initialTodos }: Props) {
  const { fetch: apiFetch } = useApi()
  const [todos, setTodos] = useState<ProjectTodoRow[]>(initialTodos)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [newLinkedType, setNewLinkedType] = useState<ProjectTodoRow['linked_type']>('none')
  const [creating, setCreating] = useState(false)

  const filtered = todos.filter((t) => statusFilter === 'all' || t.status === statusFilter)

  async function toggleStatus(todo: ProjectTodoRow) {
    const next = todo.status === 'open' ? 'done' : 'open'
    setSaving(todo.id)
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, status: next } : t)))
    await apiFetch(`/api/v1/projects/${projectId}/todos/${todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    })
    setSaving(null)
  }

  async function deleteTodo(id: string) {
    setDeleting(id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await apiFetch(`/api/v1/projects/${projectId}/todos/${id}`, { method: 'DELETE' })
    setDeleting(null)
  }

  async function createTodo() {
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await apiFetch(`/api/v1/projects/${projectId}/todos`, {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        linked_type: newLinkedType,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      setTodos((prev) => [json.data, ...prev])
      setNewTitle('')
      setNewDesc('')
      setNewPriority('medium')
      setNewLinkedType('none')
      setShowNewForm(false)
    }
    setCreating(false)
  }

  const openCount = todos.filter((t) => t.status === 'open').length
  const doneCount = todos.filter((t) => t.status === 'done').length

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {(['all', 'open', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-btn text-[13px] font-medium transition-colors duration-quick ${
                statusFilter === s
                  ? 'bg-brand text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {s === 'all' ? `All (${todos.length})` : s === 'open' ? `Open (${openCount})` : `Done (${doneCount})`}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowNewForm((v) => !v)}>
          {showNewForm ? <IconChevronUp size={14} /> : <IconPlus size={14} />}
          Add Task
        </Button>
      </div>

      {/* New task form */}
      {showNewForm && (
        <div className="bg-[var(--bg)] border border-brand/30 rounded-card p-4 mb-4 space-y-3">
          <Input
            label="Task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Review untranslatable passages in chapter 3"
          />
          <Textarea
            label="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Additional context or notes"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
              options={[
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <Select
              label="Link to"
              value={newLinkedType}
              onChange={(e) => setNewLinkedType(e.target.value as ProjectTodoRow['linked_type'])}
              options={[
                { value: 'none', label: 'None' },
                { value: 'flag', label: 'Culture Queue' },
                { value: 'character', label: 'Character' },
                { value: 'glossary_term', label: 'Glossary' },
                { value: 'author_question', label: 'Author Q&A' },
              ]}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={creating} onClick={createTodo}>
              Create Task
            </Button>
          </div>
        </div>
      )}

      {/* Todo list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)] text-[14px]">
          {statusFilter === 'all'
            ? 'No tasks yet. Add one above or upload a manuscript to auto-generate tasks.'
            : `No ${statusFilter} tasks.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo) => {
            const LinkedIcon = LINKED_TYPE_ICONS[todo.linked_type]
            const isDone = todo.status === 'done'
            return (
              <div
                key={todo.id}
                className={`group flex items-start gap-3 bg-[var(--bg)] rounded-card border p-4 transition-colors duration-quick ${
                  isDone ? 'border-[var(--border)] opacity-60' : 'border-[var(--border)] hover:border-brand/30'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleStatus(todo)}
                  disabled={saving === todo.id}
                  className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors duration-quick ${
                    isDone
                      ? 'bg-success border-success text-white'
                      : 'border-[var(--border)] hover:border-brand'
                  }`}
                >
                  {isDone && <IconCheck size={12} />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[14px] font-medium ${
                        isDone
                          ? 'line-through text-[var(--text-tertiary)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {todo.title}
                    </span>
                    <Badge variant={todo.priority} />
                    {todo.auto_generated && (
                      <span className="text-[11px] text-[var(--text-tertiary)] border border-[var(--border)] rounded px-1.5 py-0.5">
                        auto
                      </span>
                    )}
                  </div>
                  {todo.description && (
                    <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {todo.description}
                    </p>
                  )}
                </div>

                {/* Linked item chip */}
                {todo.linked_type !== 'none' && (
                  <Link
                    href={`/projects/${projectId}/${LINKED_TYPE_HREFS[todo.linked_type]}`}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[12px] text-[var(--text-secondary)] border border-[var(--border)] hover:border-brand/40 hover:text-brand transition-colors duration-quick"
                  >
                    {LinkedIcon && <LinkedIcon size={12} />}
                    {LINKED_TYPE_LABELS[todo.linked_type]}
                  </Link>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteTodo(todo.id)}
                  disabled={deleting === todo.id}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-danger transition-all duration-quick p-1 rounded"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
