
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, X, CalendarDays, ChevronDown } from 'lucide-react'
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
  initialDate?: string | null
  initialScheduledStart?: string | null
  initialScheduledEnd?: string | null
  onClose: () => void
  onCreate: (input: {
    title: string
    description: string
    workspaceId: string
    categoryId: string
    priority: TaskPriority
    status: TaskStatus
    dueDate: string | null
    reminderAt: string | null
    scheduledStart: string | null
    scheduledEnd: string | null
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

function toLocalInputValue(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function CreateTaskModal({
  open,
  workspaces,
  categories,
  initialDate,
  initialScheduledStart,
  initialScheduledEnd,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '')
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const workspaceMenuRef = useRef<HTMLDivElement>(null)
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [status, setStatus] = useState<TaskStatus>('To Do')
  const [dueDate, setDueDate] = useState(initialDate ?? '')
  const [reminderAt, setReminderAt] = useState('')
  const [scheduledStart, setScheduledStart] = useState(initialScheduledStart ? toLocalInputValue(initialScheduledStart) : '')
  const [scheduledEnd, setScheduledEnd] = useState(initialScheduledEnd ? toLocalInputValue(initialScheduledEnd) : '')
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(false)
  const [clockNow] = useState(() => new Date())

  const categoryOptions = useMemo(
    () => flattenCategories(categories, workspaceId),
    [categories, workspaceId],
  )
  const effectiveCategoryId = categoryOptions.some((item) => item.category.id === categoryId)
    ? categoryId
    : categoryOptions[0]?.category.id ?? ''

  useEffect(() => {
    if (!workspaceMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWorkspaceMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [workspaceMenuOpen])

  if (!open) return null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (
      !trimmedTitle ||
      !workspaceId ||
      !effectiveCategoryId ||
      categoryOptions.length === 0
    ) {
      return
    }

    const progressionStart = autoProgressionEnabled && scheduledStart
      ? new Date(scheduledStart)
      : null
    const progressionEnd = autoProgressionEnabled && scheduledEnd
      ? new Date(scheduledEnd)
      : null

    if (
      autoProgressionEnabled &&
      (!progressionStart ||
        !progressionEnd ||
        !Number.isFinite(progressionStart.getTime()) ||
        !Number.isFinite(progressionEnd.getTime()) ||
        progressionEnd.getTime() <= progressionStart.getTime() ||
        progressionEnd.getTime() <= Date.now())
    ) return

    onCreate({
      title: trimmedTitle,
      description: description.trim(),
      workspaceId,
      categoryId: effectiveCategoryId,
      priority,
      status,
      dueDate: dueDate || null,
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
      scheduledStart: autoProgressionEnabled && scheduledStart ? new Date(scheduledStart).toISOString() : null,
      scheduledEnd: autoProgressionEnabled && scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      autoProgressionEnabled,
      autoProgressionStartAt: progressionStart?.toISOString() ?? null,
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
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] shadow-2xl"
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

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
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
                rows={3}
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

              <div ref={workspaceMenuRef} className="relative">
                <button
                  id="task-workspace"
                  type="button"
                  disabled={workspaces.length === 0}
                  aria-haspopup="listbox"
                  aria-expanded={workspaceMenuOpen}
                  onClick={() => setWorkspaceMenuOpen((value) => !value)}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-left text-xs text-[var(--tn-text)] outline-none transition hover:border-[var(--tn-nav-active-border)] focus-visible:border-[var(--tn-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0 truncate">
                    {workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? 'Select a workspace'}
                  </span>
                  <ChevronDown size={15} className={`ml-2 shrink-0 text-[var(--tn-text-muted)] transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {workspaceMenuOpen && workspaces.length > 0 && (
                  <div
                    role="listbox"
                    aria-labelledby="task-workspace"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] py-1 text-[var(--tn-text)] shadow-2xl"
                  >
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        type="button"
                        role="option"
                        aria-selected={workspace.id === workspaceId}
                        onClick={() => {
                          setWorkspaceId(workspace.id)
                          setWorkspaceMenuOpen(false)
                        }}
                        className={`flex h-8 w-full items-center px-3 text-left text-xs transition-colors ${
                          workspace.id === workspaceId
                            ? 'bg-[var(--tn-nav-active-bg)] font-medium text-[var(--tn-nav-active-text)]'
                            : 'text-[var(--tn-text-muted)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]'
                        }`}
                      >
                        <span className="truncate">{workspace.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                value={effectiveCategoryId}
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
                style={{ colorScheme: "dark", accentColor: "var(--tn-primary)" }}
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] py-3 pl-10 pr-3 text-xs text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] "
              />
            </div>
          </div>

          {/* Optional one-off reminder */}
          <div>
            <label
              htmlFor="task-reminder-at"
              className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
            >
              Set reminder
              <span className="ml-1 font-normal text-[var(--tn-text-subtle)]">
                (optional)
              </span>
            </label>

            <input
              id="task-reminder-at"
              type="datetime-local"
              value={reminderAt}
              min={(() => {
                const localNow = new Date(clockNow.getTime() - clockNow.getTimezoneOffset() * 60000)
                return localNow.toISOString().slice(0, 16)
              })()}
              onChange={(event) => setReminderAt(event.target.value)}
              style={{ colorScheme: "dark", accentColor: "var(--tn-primary)" }}
              className="h-10 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 text-xs text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)]"
            />
            <p className="mt-1.5 text-xs text-[var(--tn-text-subtle)]">
              Choose when you want to be reminded about this task.
            </p>
          </div>

          {/* Automatic progression */}
          <section className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={autoProgressionEnabled}
                onChange={(event) => setAutoProgressionEnabled(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--tn-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--tn-text)]">Enable auto-progression</span>
                <span className="mt-1 block text-xs text-[var(--tn-text-subtle)]">
                  Automatically complete this task when its scheduled time expires.
                </span>
              </span>
            </label>

            {autoProgressionEnabled && (
              <div className="mt-4 grid gap-3 border-t border-[var(--tn-border)] pt-4 sm:grid-cols-2">
                <label className="block text-xs text-[var(--tn-text-muted)]">
                  Starts
                  <input
                    type="datetime-local"
                    required={autoProgressionEnabled}
                    value={scheduledStart}
                    onChange={(event) => setScheduledStart(event.target.value)}
                    style={{ colorScheme: "dark", accentColor: "var(--tn-primary)" }}
                    className="mt-2 h-10 w-full min-w-0 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                  />
                </label>
                <label className="block text-xs text-[var(--tn-text-muted)]">
                  Ends
                  <input
                    type="datetime-local"
                    required={autoProgressionEnabled}
                    min={scheduledStart || undefined}
                    value={scheduledEnd}
                    onChange={(event) => setScheduledEnd(event.target.value)}
                    className="mt-2 h-10 w-full min-w-0 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                  />
                </label>
                <p className="text-xs text-[var(--tn-text-subtle)] sm:col-span-2">
                  The task will automatically complete when the end time is reached.
                </p>
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
                !effectiveCategoryId ||
                categoryOptions.length === 0 ||
                (autoProgressionEnabled && (
                  !scheduledStart ||
                  !scheduledEnd ||
                  new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime() ||
                  new Date(scheduledEnd).getTime() <= clockNow.getTime()
                ))
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
