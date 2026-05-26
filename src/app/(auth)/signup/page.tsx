'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-6">Create account</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
            Full name
          </label>
          <input
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-9 px-3 rounded-[6px] border border-[var(--border)] bg-white text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] transition-colors duration-150"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-9 px-3 rounded-[6px] border border-[var(--border)] bg-white text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] transition-colors duration-150"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-9 px-3 rounded-[6px] border border-[var(--border)] bg-white text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] transition-colors duration-150"
            placeholder="Min. 8 characters"
          />
        </div>

        {error && (
          <p className="text-[12px] text-[var(--danger)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 rounded-[4px] bg-[var(--brand)] text-white text-[14px] font-medium hover:bg-[var(--brand-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] text-[var(--text-tertiary)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--brand)] hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
