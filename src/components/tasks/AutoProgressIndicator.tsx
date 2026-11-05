import { useEffect, useState } from 'react'
import { Clock3, Zap } from 'lucide-react'
import type { Task } from '../../types'

interface Props {
  task: Task
  compact?: boolean
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  if (minutes > 0) return `${minutes}m ${seconds}s remaining`
  return `${seconds}s remaining`
}

export default function AutoProgressIndicator({ task, compact = false }: Props) {
  const [, setNow] = useState(Date.now())

  useEffect(() => {
    if (!task.autoProgressionEnabled || task.status === 'Completed' || !task.autoProgressionEndAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [task.autoProgressionEnabled, task.autoProgressionEndAt, task.status])

  if (!task.autoProgressionEnabled || task.status === 'Completed' || !task.autoProgressionStartAt || !task.autoProgressionEndAt) return null

  const start = new Date(task.autoProgressionStartAt).getTime()
  const end = new Date(task.autoProgressionEndAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  const current = Date.now()
  const percentage = Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100))
  const remaining = end - current

  return (
    <div
      className={compact
        ? 'mt-3 w-full max-w-[280px] rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-2.5'
        : 'mt-3 w-full rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-3'}
      aria-label={`Automatic progression ${Math.round(percentage)} percent complete`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tn-text-subtle)]">
          <Zap size={11} className="shrink-0 text-[var(--tn-primary)]" />
          Auto progression
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--tn-primary)]">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--tn-border)]/80">
        <div
          className="h-full rounded-full bg-[var(--tn-primary)] transition-[width] duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-[var(--tn-text-muted)]">
        <Clock3 size={11} className="shrink-0 text-[var(--tn-text-subtle)]" />
        {remaining > 0 ? formatRemaining(remaining) : 'Completing…'}
      </p>
    </div>
  )
}
