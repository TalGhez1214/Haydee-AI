import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'high'
  | 'medium'
  | 'low'
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'open'
  | 'sent'
  | 'answered'
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
  | 'done'
  | 'research'
  | 'preface_draft'
  | 'reference'
  | 'bookmark_cat'

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
  sent: 'Sent',
  answered: 'Answered',
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
  done: 'Done',
  research: 'Research',
  preface_draft: 'Preface Draft',
  reference: 'Reference',
  bookmark_cat: 'Bookmark',
}

const STYLES: Record<BadgeVariant, string> = {
  high: 'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
  pending: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  approved: 'bg-success/10 text-success border-success/20',
  flagged: 'bg-danger/10 text-danger border-danger/20',
  open: 'bg-brand/10 text-brand border-brand/20',
  sent: 'bg-info/10 text-info border-info/20',
  answered: 'bg-success/10 text-success border-success/20',
  resolved: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border)]',
  dismissed: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border)]',
  consistency: 'bg-danger/10 text-danger border-danger/20',
  culture: 'bg-warning/10 text-warning border-warning/20',
  untranslatable: 'bg-info/10 text-info border-info/20',
  glossary: 'bg-success/10 text-success border-success/20',
  in_progress: 'bg-brand/10 text-brand border-brand/20',
  review: 'bg-warning/10 text-warning border-warning/20',
  delivered: 'bg-success/10 text-success border-success/20',
  archived: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border)]',
  free: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  pro: 'bg-brand/10 text-brand border-brand/20',
  team: 'bg-success/10 text-success border-success/20',
  done: 'bg-success/10 text-success border-success/20',
  research: 'bg-info/10 text-info border-info/20',
  preface_draft: 'bg-brand/10 text-brand border-brand/20',
  reference: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  bookmark_cat: 'bg-warning/10 text-warning border-warning/20',
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
