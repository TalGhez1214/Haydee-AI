import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-9 w-full rounded-input border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px] text-[var(--text-primary)]',
          'placeholder:text-[var(--text-tertiary)]',
          'transition-colors duration-quick',
          'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
          'disabled:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:text-[var(--text-tertiary)]',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  )
})
