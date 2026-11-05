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
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--tn-text-muted)]">{label}</span>
        <span className={`stat-icon flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight text-[var(--tn-text)]">
          {value}
        </span>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--tn-success)]">
            <ArrowUpRight size={12} aria-hidden="true" />
            {trend}
          </span>
        )}
      </div>

      <p className="mt-1 text-[11px] text-[var(--tn-text-muted)]">{note}</p>
    </article>
  )
}
