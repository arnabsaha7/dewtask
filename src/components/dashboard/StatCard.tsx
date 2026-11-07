import type { ComponentType } from 'react'
import { ArrowUpRight } from 'lucide-react'

interface Props {
  label: string
  value: number
  note: string
  icon: ComponentType<{ size?: number; className?: string }>
  tone?: 'primary' | 'success' | 'info' | 'warning'
  trend?: string
}

const toneClasses = {
  primary: 'stat-icon-primary',
  success: 'stat-icon-success',
  info: 'stat-icon-info',
  warning: 'stat-icon-warning',
} as const

export default function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'primary',
  trend,
}: Props) {
  return (
    <article className="stat-card rounded-xl border p-5 transition-colors">
      <dl className="flex min-h-[132px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <dt className="pt-1 text-sm font-medium leading-5 text-[var(--tn-text-muted)]">
            {label}
          </dt>
          <span
            aria-hidden="true"
            className={`stat-icon flex size-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}
          >
            <Icon size={17} />
          </span>
        </div>

        <dd className="mt-1 text-3xl font-semibold leading-tight tracking-tight tabular-nums text-[var(--tn-text)]">
          {value.toLocaleString()}
        </dd>

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3">
          <p className="text-xs leading-4 text-[var(--tn-text-muted)]">{note}</p>
          {trend && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--tn-success)]">
              <ArrowUpRight size={12} aria-hidden="true" />
              {trend}
            </span>
          )}
        </div>
      </dl>
    </article>
  )
}
