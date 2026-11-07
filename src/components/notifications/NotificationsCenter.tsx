import { Bell, CheckCheck, Clock3, AlertCircle, CalendarCheck, X } from 'lucide-react'
import type { TaskNotification } from '../../hooks/useNotificationScheduler'

interface Props {
  open: boolean
  notifications: TaskNotification[]
  onClose: () => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onSelectTask: (taskId: string) => void
}

function formatTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function NotificationsCenter({ open, notifications, onClose, onMarkRead, onMarkAllRead, onSelectTask }: Props) {
  if (!open) return null
  const unread = notifications.filter((item) => !item.readAt).length
  const Icon = ({ kind }: { kind: TaskNotification['kind'] }) => kind === 'overdue'
    ? <AlertCircle size={16} className="text-red-400" />
    : kind === 'due'
      ? <CalendarCheck size={16} className="text-amber-400" />
      : <Clock3 size={16} className="text-[var(--tn-primary)]" />

  return (
    <>
      <button type="button" aria-label="Close notifications" onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-black/10" />
      <section aria-label="Notifications" className="absolute right-5 top-[64px] z-50 flex max-h-[min(640px,calc(100dvh-100px))] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] shadow-2xl sm:right-7">
        <header className="flex items-center justify-between border-b border-[var(--tn-border)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tn-primary)]/10 text-[var(--tn-primary)]"><Bell size={16} /></span>
            <div><h2 className="text-sm font-semibold text-[var(--tn-text)]">Notifications</h2><p className="text-[11px] text-[var(--tn-text-subtle)]">{unread ? `${unread} unread` : 'You are all caught up'}</p></div>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && <button type="button" onClick={onMarkAllRead} title="Mark all as read" className="rounded-lg p-2 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"><CheckCheck size={16} /></button>}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"><X size={16} /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center"><Bell size={24} className="text-[var(--tn-text-subtle)]" /><p className="mt-3 text-sm font-medium text-[var(--tn-text)]">No notifications yet</p><p className="mt-1 max-w-[240px] text-xs leading-5 text-[var(--tn-text-subtle)]">Task reminders and deadline alerts will appear here.</p></div>
          ) : notifications.map((item) => (
            <button key={item.id} type="button" onClick={() => { onMarkRead(item.id); onSelectTask(item.taskId) }} className={`flex w-full gap-3 border-b border-[var(--tn-border)] px-4 py-3.5 text-left transition hover:bg-[var(--tn-surface-hover)] ${item.readAt ? '' : 'bg-[var(--tn-primary)]/[0.045]'}`}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--tn-surface-muted)]"><Icon kind={item.kind} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--tn-text)]">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-[var(--tn-text-muted)]">{item.message}</span><span className="mt-1.5 block text-[10px] text-[var(--tn-text-subtle)]">{formatTime(item.createdAt)}</span></span>
              {!item.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--tn-primary)]" />}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
