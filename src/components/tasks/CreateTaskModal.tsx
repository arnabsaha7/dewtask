
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, X, CalendarDays } from 'lucide-react'
import CategoryTreeSelect from './CategoryTreeSelect'
import type {
  Category,
  TaskPriority,
  TaskStatus,
  Workspace,
} from '../../types'

interface Props {
  open: boolean
  workspaces: Workspace[]
  categories: Category[]
  onClose: () => void
  onCreate: (input: {
    title: string
    description: string
    workspaceId: string
    categoryId: string
    priority: TaskPriority
    status: TaskStatus
    dueDate: string | null
    autoProgressionEnabled: boolean
    autoProgressionStartAt: string | null
    autoProgressionEndAt: string | null
  }) => void
}

interface CategoryOption {
  category: Category
  depth: number
}

function flattenCategories(
  categories: Category[],
  workspaceId: string,
): CategoryOption[] {
  const workspaceCategories = categories.filter(
    (category) => category.workspaceId === workspaceId,
  )

  const result: CategoryOption[] = []

  const visit = (parentId: string | null, depth: number) => {
    const children = workspaceCategories
      .filter((category) => category.parentId === parentId)
      .sort((a, b) => a.order - b.order)

    for (const category of children) {
      result.push({ category, depth })
      visit(category.id, depth + 1)
    }
  }

  visit(null, 0)
  return result
}

const priorities: TaskPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
]

const statuses: TaskStatus[] = [
  'To Do',
  'In Progress',
  'Completed',
]

function getPriorityStyle(priority: TaskPriority, selected: boolean) {
  if (!selected) {
    return 'border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'
  }

  const styles: Record<TaskPriority, string> = {
    Low: 'border-slate-400/50 bg-slate-400/10 text-[var(--tn-text-muted)]',
    Medium: 'border-sky-400/50 bg-sky-400/10 text-sky-700',
    High: 'border-amber-400/50 bg-amber-400/10 text-amber-700',
    Critical: 'border-red-400/50 bg-red-400/10 text-red-700',
  }

  return styles[priority]
}

function getStatusStyle(status: TaskStatus, selected: boolean) {
  if (!selected) {
    return 'border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'
  }

  const styles: Record<TaskStatus, string> = {
    'To Do': 'border-slate-400/50 bg-slate-400/10 text-[var(--tn-text-muted)]',
    'In Progress': 'border-indigo-400/50 bg-indigo-400/10 text-[var(--tn-primary)]',
    Completed: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-700',
  }

  return styles[status]
}

export default function CreateTaskModal({
  open,
  workspaces,
  categories,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workspaceId, setWorkspaceId] = useState(
    workspaces[0]?.id ?? '',
  )
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [status, setStatus] = useState<TaskStatus>('To Do')
  const [dueDate, setDueDate] = useState('')
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(false)
  const [scheduleType, setScheduleType] = useState<'duration' | 'end'>('duration')
  const [durationHours, setDurationHours] = useState('1')
  const [autoEndAt, setAutoEndAt] = useState('')

  const categoryOptions = useMemo(
    () => flattenCategories(categories, workspaceId),
    [categories, workspaceId],
  )

  useEffect(() => {
    if (!categoryOptions.some((item) => item.category.id === categoryId)) {
      setCategoryId(categoryOptions[0]?.category.id ?? '')
    }
  }, [categoryOptions, categoryId])

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setWorkspaceId(workspaces[0]?.id ?? '')
      setPriority('Medium')
      setStatus('To Do')
      setDueDate('')
      setAutoProgressionEnabled(false)
      setScheduleType('duration')
      setDurationHours('1')
      setAutoEndAt('')
    }
  }, [open, workspaces])

  if (!open) return null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (
      !trimmedTitle ||
      !workspaceId ||
      !categoryId ||
      categoryOptions.length === 0
    ) {
      return
    }

    const now = new Date()
    const progressionEnd = autoProgressionEnabled
      ? scheduleType === 'duration'
        ? new Date(now.getTime() + Number(durationHours) * 60 * 60 * 1000)
        : new Date(autoEndAt)
      : null

    if (
      autoProgressionEnabled &&
      (!progressionEnd || !Number.isFinite(progressionEnd.getTime()) ||
        progressionEnd.getTime() <= now.getTime() ||
        (scheduleType === 'duration' && (!Number.isFinite(Number(durationHours)) || Number(durationHours) <= 0)))
    ) return

    onCreate({
      title: trimmedTitle,
      description: description.trim(),
      workspaceId,
      categoryId,
      priority,
      status,
      dueDate: dueDate || null,
      autoProgressionEnabled,
      autoProgressionStartAt: autoProgressionEnabled ? now.toISOString() : null,
      autoProgressionEndAt: progressionEnd?.toISOString() ?? null,
    })

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--tn-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] px-6 py-5">
          <div>
            <h2
              id="create-task-title"
              className="text-base font-semibold text-[var(--tn-text)]"
            >
              Create a task
            </h2>
            <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">
              Add something you want to get done.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)]"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Title */}
          <div>
            <label
              htmlFor="task-title"
              className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
            >
              Task name <span className="text-red-400">*</span>
            </label>

            <input
              id="task-title"
              autoFocus
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3.5 py-3 text-sm text-[var(--tn-text)] outline-none transition placeholder:text-[var(--tn-text-subtle)] focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--tn-text-muted)]">
              Description <span className="text-[var(--tn-text-subtle)]">(optional)</span>
            </label>

            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Add more details about this task..."
                rows={4}
                className="w-full resize-none rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3 pb-8 text-sm text-[var(--tn-text)] placeholder:text-[var(--tn-text-subtle)] focus:border-[var(--tn-primary)] focus:outline-none"
              />

              <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-[var(--tn-text-subtle)]">
                {description.length}/2000
              </span>
            </div>
          </div>

          {/* Workspace and category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-workspace"
                className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
              >
                Workspace
              </label>

              <select
                id="task-workspace"
                required
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-category"
                className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
              >
                Category
              </label>

              <CategoryTreeSelect
                options={categoryOptions}
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                disabled={categoryOptions.length === 0}
              />
            </div>
          </div>

          {workspaces.length === 0 && (
            <p className="text-xs text-amber-400">
              Create a workspace before adding a task.
            </p>
          )}

          {workspaces.length > 0 && categoryOptions.length === 0 && (
            <p className="text-xs text-amber-400">
              Create a category in this workspace before adding a task.
            </p>
          )}

          {/* Priority */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]">
              Priority
            </label>

            <div className="grid grid-cols-4 gap-2">
              {priorities.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={priority === item}
                  onClick={() => setPriority(item)}
                  className={`rounded-lg border px-2 py-2.5 text-[11px] font-medium transition ${getPriorityStyle(
                    item,
                    priority === item,
                  )}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]">
              Status
            </label>

            <div className="grid grid-cols-3 gap-2">
              {statuses.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={status === item}
                  onClick={() => setStatus(item)}
                  className={`rounded-lg border px-2 py-2.5 text-[11px] font-medium transition ${getStatusStyle(
                    item,
                    status === item,
                  )}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label
              htmlFor="task-due-date"
              className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
            >
              Due date
              <span className="ml-1 font-normal text-[var(--tn-text-subtle)]">
                (optional)
              </span>
            </label>

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tn-text-subtle)]"
              />

              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] py-3 pl-10 pr-3 text-xs text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] "
              />
            </div>
          </div>

          {/* Automatic progression */}
          <section className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={autoProgressionEnabled} onChange={(event) => setAutoProgressionEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--tn-primary)]" />
              <span>
                <span className="block text-sm font-medium text-[var(--tn-text)]">Enable auto-progression</span>
                <span className="mt-1 block text-xs text-[var(--tn-text-subtle)]">Automatically complete this task when its scheduled time expires.</span>
              </span>
            </label>
            {autoProgressionEnabled && (
              <div className="mt-4 space-y-3 border-t border-[var(--tn-border)] pt-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setScheduleType('duration')} className={`rounded-lg border px-3 py-2 text-xs ${scheduleType === 'duration' ? 'border-[var(--tn-primary)] text-[var(--tn-primary)]' : 'border-[var(--tn-border)] text-[var(--tn-text-muted)]'}`}>Duration</button>
                  <button type="button" onClick={() => setScheduleType('end')} className={`rounded-lg border px-3 py-2 text-xs ${scheduleType === 'end' ? 'border-[var(--tn-primary)] text-[var(--tn-primary)]' : 'border-[var(--tn-border)] text-[var(--tn-text-muted)]'}`}>End date &amp; time</button>
                </div>
                {scheduleType === 'duration' ? (
                  <label className="block text-xs text-[var(--tn-text-muted)]">Duration (hours)
                    <input type="number" min="0.01" step="any" required={autoProgressionEnabled} value={durationHours} onChange={(event) => setDurationHours(event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2.5 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]" />
                  </label>
                ) : (
                  <label className="block text-xs text-[var(--tn-text-muted)]">End date &amp; time
                    <input type="datetime-local" required={autoProgressionEnabled} min={new Date().toISOString().slice(0, 16)} value={autoEndAt} onChange={(event) => setAutoEndAt(event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2.5 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]" />
                  </label>
                )}
                <p className="text-xs text-[var(--tn-text-subtle)]">The timer starts when the task is created.</p>
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-[var(--tn-border)] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-xs text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                !title.trim() ||
                !workspaceId ||
                !categoryId ||
                categoryOptions.length === 0 ||
                (autoProgressionEnabled && (scheduleType === 'duration'
                  ? !Number.isFinite(Number(durationHours)) || Number(durationHours) <= 0
                  : !autoEndAt || new Date(autoEndAt).getTime() <= Date.now()))
              }
              className="flex items-center gap-2 rounded-lg bg-[var(--tn-primary)] text-white px-5 py-2.5 text-xs font-medium transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={14} />
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
