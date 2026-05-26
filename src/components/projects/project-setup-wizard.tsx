'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useApi } from '@/hooks/use-api'
import { useToast } from '@/components/ui/toast'
import {
  IconUpload,
  IconFile,
  IconCheck,
  IconX,
} from '@tabler/icons-react'

interface ProjectSetupWizardProps {
  open: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3

interface BookDetails {
  title: string
  author_name: string
  source_language: string
  target_language: string
  genre: string
  deadline: string
  style_guide: string
}

const LANGUAGE_OPTIONS = [
  'Arabic', 'Bulgarian', 'Catalan', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Estonian', 'Finnish',
  'French', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian', 'Indonesian',
  'Italian', 'Japanese', 'Korean', 'Latvian', 'Lithuanian', 'Norwegian',
  'Polish', 'Portuguese', 'Romanian', 'Russian', 'Serbian', 'Slovak',
  'Slovenian', 'Spanish', 'Swedish', 'Thai', 'Turkish', 'Ukrainian', 'Vietnamese',
].map((l) => ({ value: l, label: l }))

const GENRE_OPTIONS = [
  'Literary Fiction', 'Genre Fiction', 'Mystery/Thriller', 'Science Fiction',
  'Fantasy', 'Historical Fiction', 'Romance', 'Horror', 'Biography', 'Memoir',
  'Non-fiction', "Children's", 'Young Adult', 'Poetry', 'Drama', 'Other',
].map((g) => ({ value: g, label: g }))

const ALLOWED_EXTS = ['docx', 'pdf', 'txt', 'epub']
const ALLOWED_MIME = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
  'application/epub+zip',
]

export function ProjectSetupWizard({ open, onClose }: ProjectSetupWizardProps) {
  const router = useRouter()
  const { fetch: apiFetch } = useApi()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)

  const [details, setDetails] = useState<BookDetails>({
    title: '',
    author_name: '',
    source_language: '',
    target_language: '',
    genre: '',
    deadline: '',
    style_guide: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof BookDetails, string>>>({})

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  function set(field: keyof BookDetails, value: string) {
    setDetails((d) => ({ ...d, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!details.title.trim()) e.title = 'Title is required'
    if (!details.source_language) e.source_language = 'Required'
    if (!details.target_language) e.target_language = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleStep1Next() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: details.title.trim(),
          author_name: details.author_name || undefined,
          source_language: details.source_language,
          target_language: details.target_language,
          genre: details.genre || undefined,
          deadline: details.deadline || undefined,
          style_guide: details.style_guide || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to create project')
      setProjectId(json.data.id)
      setStep(2)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create project', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2Upload() {
    if (!file || !projectId) return
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/v1/projects/${projectId}/manuscripts/upload`, {
        method: 'POST',
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        body: formData,
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'Upload failed')
      setStep(3)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  function pickFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_MIME.includes(f.type) && !ALLOWED_EXTS.includes(ext)) {
      toast('Only DOCX, PDF, TXT, and EPUB files are supported', 'error')
      return
    }
    setFile(f)
  }

  function handleClose() {
    if (step === 3 && projectId) {
      router.push(`/projects/${projectId}`)
      router.refresh()
    }
    onClose()
    setTimeout(() => {
      setStep(1)
      setProjectId(null)
      setFile(null)
      setDetails({
        title: '', author_name: '', source_language: '', target_language: '',
        genre: '', deadline: '', style_guide: '',
      })
      setErrors({})
    }, 300)
  }

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === 1 ? 'New Project — Book Details'
        : step === 2 ? 'Upload Manuscript'
        : 'Analysis Started'
      }
      className="max-w-xl"
    >
      {/* Step indicators */}
      <div className="flex items-center gap-1.5 mb-6">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            {i > 0 && (
              <div className={`w-8 h-px ${step > s - 1 ? 'bg-brand' : 'bg-[var(--border)]'}`} />
            )}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors duration-quick flex-shrink-0
                ${step > s ? 'bg-success text-white' : step === s ? 'bg-brand text-white' : 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]'}`}
            >
              {step > s ? <IconCheck size={12} /> : s}
            </div>
            <span
              className={`text-[12px] whitespace-nowrap ${
                step === s ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'
              }`}
            >
              {s === 1 ? 'Details' : s === 2 ? 'Upload' : 'Done'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1 — Book details */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Book Title *"
            value={details.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            placeholder="e.g. Crime and Punishment"
          />
          <Input
            label="Author Name"
            value={details.author_name}
            onChange={(e) => set('author_name', e.target.value)}
            placeholder="e.g. Fyodor Dostoevsky"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Source Language *"
              value={details.source_language}
              onChange={(e) => set('source_language', e.target.value)}
              error={errors.source_language}
              options={LANGUAGE_OPTIONS}
              placeholder="Select language"
            />
            <Select
              label="Target Language *"
              value={details.target_language}
              onChange={(e) => set('target_language', e.target.value)}
              error={errors.target_language}
              options={LANGUAGE_OPTIONS}
              placeholder="Select language"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Genre"
              value={details.genre}
              onChange={(e) => set('genre', e.target.value)}
              options={GENRE_OPTIONS}
              placeholder="Select genre"
            />
            <Input
              label="Deadline"
              type="date"
              value={details.deadline}
              onChange={(e) => set('deadline', e.target.value)}
            />
          </div>
          <Textarea
            label="Style Guide Notes"
            value={details.style_guide}
            onChange={(e) => set('style_guide', e.target.value)}
            placeholder="e.g. Use formal register, preserve honorifics, keep character names transliterated..."
            className="min-h-[72px]"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStep1Next} loading={loading}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — File upload */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Upload your source manuscript. Supported formats: DOCX, PDF, TXT, EPUB.
          </p>

          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f) }}
            onClick={() => document.getElementById('wizard-file-input')?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('wizard-file-input')?.click() }}
            className={`relative border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
              ${dragging ? 'border-brand bg-brand/5' : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]'}`}
          >
            <input
              id="wizard-file-input"
              type="file"
              accept=".docx,.pdf,.txt,.epub"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
            />

            {file ? (
              <>
                <div className="w-10 h-10 rounded-card bg-brand/10 flex items-center justify-center">
                  <IconFile size={20} className="text-brand" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">{file.name}</p>
                  <p className="text-[12px] text-[var(--text-secondary)]">{fileSizeMB} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="flex items-center gap-1 text-[12px] text-danger hover:underline"
                >
                  <IconX size={12} />
                  Remove
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-card bg-[var(--bg-muted)] flex items-center justify-center">
                  <IconUpload size={20} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] text-[var(--text-primary)]">Drop your manuscript here</p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                    or click to browse · DOCX, PDF, TXT, EPUB
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStep2Upload}
                loading={loading}
                disabled={!file}
              >
                Upload & Analyze
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Confirmation */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-4 gap-4">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
              <IconCheck size={28} className="text-success" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-[16px] font-medium text-[var(--text-primary)]">
                Manuscript uploaded
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] max-w-[340px] mx-auto">
                AI analysis has started. Characters, glossary terms, and cultural flags will
                appear within a few minutes.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[6px] px-3 py-2">
              <Spinner size="sm" />
              <span>Analysis in progress…</span>
            </div>
          </div>
          <div className="flex justify-center pt-1">
            <Button variant="primary" onClick={handleClose}>
              View Project
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
