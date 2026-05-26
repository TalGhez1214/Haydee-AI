'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { Spinner } from './spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:
    'bg-brand text-white hover:bg-brand-dark active:bg-brand-dark disabled:bg-brand/50',
  ghost:
    'bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-muted)] active:bg-[var(--bg-muted)]',
  success:
    'bg-success text-white hover:bg-success/90 active:bg-success/80 disabled:bg-success/50',
  danger:
    'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 disabled:bg-danger/50',
}

const sizes = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-9 px-4 text-[14px]',
  lg: 'h-11 px-5 text-[15px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors duration-quick',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
})
