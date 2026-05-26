import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'high'
  | 'medium'
  | 'low'
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'open'
  | 'resolved'
  | 'dismissed'
  | 'consistency'
  | 'culture'
  | 'untranslatable'
  | 'glossary'
  | 'in_progress'
  | 'review'
  | 'delivered'
  | 'archived'
  | 'free'
  | 'pro'
  | 'team'

interface BadgeProps {
  variant: BadgeVariant
  className?: string
  children?: React.ReactNode
}

const LABELS: Record<BadgeVariant, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  pending: 'Pending',
  approved: 'Approved',
  flagged: 'Flagged',
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  consistency: 'Consistency',
  culture: 'Culture',
  untranslatable: 'Untranslatable',
  glossary: 'Glossary',
  in_progress: 'In Progress',
  review: 'Review',
  delivered: 'Delivered',
  archived: 'Archived',
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
}

const STYLES: Record<BadgeVariant, string> = {
  high: 'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
  pending: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  approved: 'bg-success/10 text-success border-success/20',
  flagged: 'bg-danger/10 text-danger border-danger/20',
  open: 'bg-brand/10 text-brand border-brand/20',
  resolved: 'bg-success/10 text-success border-success/20',
  dismissed: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border)]',
  consistency: 'bg-danger/10 text-danger border-danger/20',
  culture: 'bg-warning/10 text-warning border-warning/20',
  untranslatable: 'bg-brand/10 text-brand border-brand/20',
  glossary: 'bg-success/10 text-success border-success/20',
  in_progress: 'bg-brand/10 text-brand border-brand/20',
  review: 'bg-warning/10 text-warning border-warning/20',
  delivered: 'bg-success/10 text-success border-success/20',
  archived: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border)]',
  free: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  pro: 'bg-brand/10 text-brand border-brand/20',
  team: 'bg-success/10 text-success border-success/20',
}

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-badge border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap',
        STYLES[variant],
        className
      )}
    >
      {children ?? LABELS[variant]}
    </span>
  )
}
