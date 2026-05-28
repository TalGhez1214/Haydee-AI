'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconTrash } from '@tabler/icons-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'

interface Props {
  projectId: string
  projectTitle: string
}

export function DeleteProjectButton({ projectId, projectTitle }: Props) {
  const { fetch: apiFetch } = useApi()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-danger hover:bg-danger/10 transition-colors duration-quick"
        aria-label="Delete project"
      >
        <IconTrash size={15} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete project">
        <p className="text-[14px] text-[var(--text-secondary)] mb-1">
          Are you sure you want to delete{' '}
          <span className="font-medium text-[var(--text-primary)]">{projectTitle}</span>?
        </p>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-6">
          This will permanently delete the project and all its manuscripts, characters, glossary
          terms, flags, and AI analysis. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
            Delete project
          </Button>
        </div>
      </Modal>
    </>
  )
}
