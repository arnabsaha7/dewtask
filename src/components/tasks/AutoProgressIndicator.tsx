import { useEffect, useState } from 'react'
import { Clock3, Zap } from 'lucide-react'
import type { Task } from '../../types'

interface Props {
  task: Task
  compact?: boolean
  compactWidth?: 'default' | 'wide'
  /** Use the available column width in compact layouts. */
  fullWidth?: boolean
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default function AutoProgressIndicator({
  task,
  compact = false,
  compactWidth = 'default',
  fullWidth = false,
}: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (
      !task.autoProgressionEnabled ||
      task.status === 'Completed' ||
      !task.autoProgressionStartAt ||
      !task.autoProgressionEndAt
    ) return

    const updateClock = () => setNow(Date.now())
    updateClock()
    const interval = window.setInterval(updateClock, 1000)
    window.addEventListener('focus', updateClock)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', updateClock)
    }
  }, [
    task.autoProgressionEnabled,
    task.autoProgressionStartAt,
    task.autoProgressionEndAt,
    task.status,
  ])

  if (
    !task.autoProgressionEnabled ||
    task.status === 'Completed' ||
    !task.autoProgressionStartAt ||
    !task.autoProgressionEndAt
  ) return null

  const start = new Date(task.autoProgressionStartAt).getTime()
  const end = new Date(task.autoProgressionEndAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  const scheduled = now < start
  const expired = now >= end
  const percentage = scheduled ? 0 : expired ? 100 : Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  const timeLabel = scheduled
    ? `Starts in ${formatDuration(start - now)}`
    : expired
      ? 'Completing…'
      : `${formatDuration(end - now)} remaining`

  if (compact) {
    return (
      <div
        className={`${fullWidth || compactWidth === 'wide' ? 'w-full min-w-0' : 'w-[76px] min-w-[64px] max-w-[38%] shrink-0'}`}
        aria-label={`Auto progression ${Math.round(percentage)} percent complete`}
        role="status"
        title={`${Math.round(percentage)}% complete`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--tn-status-progress-soft)]">
            <div
              className="h-full rounded-full bg-[var(--tn-status-progress)] transition-[width] duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="shrink-0 text-[9px] font-semibold tabular-nums text-[var(--tn-status-progress)]">{Math.round(percentage)}%</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="mt-3 w-full rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-3"
      aria-label={`Auto progression ${Math.round(percentage)} percent complete. ${timeLabel}`}
      role="status"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tn-text-subtle)]">
          <Zap size={11} className="shrink-0 text-[var(--tn-primary)]" />
          Auto progression
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--tn-status-progress)]">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--tn-border)]/80">
        <div className="h-full rounded-full bg-[var(--tn-status-progress)] transition-[width] duration-700" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-[var(--tn-text-muted)]">
        <Clock3 size={11} className="shrink-0 text-[var(--tn-text-subtle)]" />
        {timeLabel}
      </p>
    </div>
  )
}
