'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

export function SecurityForm() {
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})

  async function handleSubmit() {
    const e: typeof errors = {}
    if (newPassword.length < 8) e.newPassword = 'At least 8 characters required'
    if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast('Password updated', 'success')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update password', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Input
        label="New password"
        type="password"
        value={newPassword}
        onChange={(e) => {
          setNewPassword(e.target.value)
          if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }))
        }}
        error={errors.newPassword}
        placeholder="Min. 8 characters"
      />
      <Input
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value)
          if (errors.confirmPassword)
            setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
        }}
        error={errors.confirmPassword}
        placeholder="Repeat new password"
      />
      <div>
        <Button onClick={handleSubmit} loading={saving} disabled={!newPassword}>
          Update password
        </Button>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
          You'll receive a confirmation email if your address changes.
        </p>
      </div>
    </div>
  )
}
