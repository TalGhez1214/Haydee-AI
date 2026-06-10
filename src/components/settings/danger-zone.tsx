'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

export function DangerZone() {
  const { fetch: apiFetch } = useApi()
  const { toast } = useToast()
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      const res = await apiFetch('/api/v1/users', { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'Deletion failed')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error deleting account', 'error')
      setDeleting(false)
      setModalOpen(false)
    }
  }

  return (
    <>
      <div className="mt-8 rounded-card border border-danger/30 bg-danger/5 p-6">
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="w-full sm:w-[200px] shrink-0">
            <h2 className="text-[15px] font-semibold text-danger">Danger Zone</h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">Irreversible actions</p>
          </div>
          <div className="flex-1">
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">
              Permanently delete your account and all associated data including projects,
              translations, and AI history. This cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setModalOpen(true)}>
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !deleting && setModalOpen(false)}
        title="Delete Account"
      >
        <p className="text-[14px] text-[var(--text-secondary)]">
          This will permanently delete your account and all associated data. This action{' '}
          <strong className="text-[var(--text-primary)]">cannot be undone</strong>.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} loading={deleting}>
            Delete my account
          </Button>
        </div>
      </Modal>
    </>
  )
}
