'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { useToast } from '@/components/ui/toast'
import type { UserRow } from '@/types/database'

interface ProfileFormProps {
  userRow: UserRow
}

export function ProfileForm({ userRow }: ProfileFormProps) {
  const { fetch: apiFetch } = useApi()
  const { toast } = useToast()
  const [name, setName] = useState(userRow.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const unchanged = name.trim() === (userRow.full_name ?? '').trim()

  async function handleSave() {
    if (!name.trim()) {
      setError('Name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch('/api/v1/users', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: name.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to save')
      toast('Profile updated', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Full name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (error) setError(undefined)
        }}
        error={error}
        placeholder="Your name"
      />
      <div>
        <Input label="Email" value={userRow.email} disabled />
        <p className="text-[12px] text-[var(--text-tertiary)] mt-1.5">
          Email is managed by your auth account and cannot be changed here.
        </p>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)]">
        Member since {format(new Date(userRow.created_at), 'MMMM d, yyyy')}
      </p>
      <div>
        <Button onClick={handleSave} loading={saving} disabled={unchanged}>
          Save changes
        </Button>
      </div>
    </div>
  )
}
