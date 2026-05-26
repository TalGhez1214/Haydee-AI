import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, className, id, ...props },
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
      <select
        ref={ref}
        id={inputId}
        className={cn(
          'h-9 w-full rounded-input border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px] text-[var(--text-primary)]',
          'transition-colors duration-quick appearance-none',
          'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
          'disabled:bg-[var(--bg-muted)] disabled:cursor-not-allowed',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  )
})
