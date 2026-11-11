import type { ReactNode } from 'react'

interface ProfileSectionProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export default function ProfileSection({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = '',
}: ProfileSectionProps) {
  return (
    <section className={`min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] ${className}`}>
      <header className="flex items-start justify-between gap-4 border-b border-[var(--tn-border)] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--tn-text)]">{title}</h2>
          {description && (
            <p className="mt-1 text-[13px] leading-5 text-[var(--tn-text-muted)]">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className={`px-5 sm:px-6 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
