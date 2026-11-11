
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import {
  X,
  CalendarDays,
  Check,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  ListChecks,
  Tag as TagIcon,
} from 'lucide-react'

import type {
  Task,
  TaskPriority,
  TaskStatus,
  ChecklistItem,
  Category,
  Workspace,
  Tag,
} from '../../types'

import CategoryTreeSelect from './CategoryTreeSelect'

interface Props {
  task: Task
  workspaces: Workspace[]
  categories: Category[]
  tags: Tag[]
  onClose: () => void
  onSave: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
}

function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

interface CategoryOption {
  category: Category
  depth: number
}

const priorityOptions: TaskPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
]

const statusOptions: TaskStatus[] = [
  'To Do',
  'In Progress',
  'Completed',
]

function getCategoryOptions(
  categories: Category[],
  workspaceId: string
): CategoryOption[] {
  const workspaceCategories = categories.filter(
    (category) => category.workspaceId === workspaceId
  )

  const result: CategoryOption[] = []

  const addChildren = (parentId: string | null, depth: number) => {
    const children = workspaceCategories
      .filter((category) => category.parentId === parentId)
      .sort((a, b) => a.order - b.order)

    for (const category of children) {
      result.push({ category, depth })
      addChildren(category.id, depth + 1)
    }
  }

  addChildren(null, 0)

  return result
}

export default function TaskDetailsDrawer({
  task,
  workspaces,
  categories,
  tags,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [reminderAt, setReminderAt] = useState(toLocalDateTimeInput(task.reminderAt))
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(task.autoProgressionEnabled ?? false)
  const [scheduleType, setScheduleType] = useState<'duration' | 'end'>('end')
  const [durationHours, setDurationHours] = useState('1')
  const [autoStartAt, setAutoStartAt] = useState(() => toLocalDateTimeInput(task.autoProgressionStartAt) || toLocalDateTimeInput(new Date().toISOString()))
  const [autoEndAt, setAutoEndAt] = useState(toLocalDateTimeInput(task.autoProgressionEndAt))
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    task.checklist ?? []
  )
  const [newItem, setNewItem] = useState('')

  const [workspaceId, setWorkspaceId] = useState(task.workspaceId)
  const [categoryId, setCategoryId] = useState(task.categoryId)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    task.tagIds ?? []
  )

  const categoryOptions = useMemo(
    () => getCategoryOptions(categories, workspaceId),
    [categories, workspaceId]
  )

  const workspaceTags = useMemo(
    () =>
      tags
        .filter((tag) => tag.workspaceId === workspaceId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tags, workspaceId]
  )

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const progressionStart = task.autoProgressionStartAt ? new Date(task.autoProgressionStartAt).getTime() : null
  const progressionEnd = task.autoProgressionEndAt ? new Date(task.autoProgressionEndAt).getTime() : null
  const progressionDuration = progressionStart !== null && progressionEnd !== null ? progressionEnd - progressionStart : 0
  const progressionPercent = progressionDuration > 0 && progressionStart !== null
    ? Math.min(100, Math.max(0, ((clockNow - progressionStart) / progressionDuration) * 100))
    : 0
  const remainingMs = progressionEnd !== null ? Math.max(0, progressionEnd - clockNow) : 0
  const formatRemaining = (milliseconds: number) => {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (days) return `${days}d ${hours}h ${minutes}m`
    if (hours) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const completedItems = checklist.filter(
    (item) => item.completed
  ).length

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    setWorkspaceId(newWorkspaceId)

    const newCategoryOptions = getCategoryOptions(
      categories,
      newWorkspaceId
    )

    setCategoryId(newCategoryOptions[0]?.category.id ?? '')

    // Keep only tags belonging to the new workspace.
    const newWorkspaceTagIds = tags
      .filter((tag) => tag.workspaceId === newWorkspaceId)
      .map((tag) => tag.id)

    setSelectedTagIds((current) =>
      current.filter((id) => newWorkspaceTagIds.includes(id))
    )
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    )
  }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (!trimmedTitle || !workspaceId || !categoryId) return

    const validCategory = categories.some(
      (category) =>
        category.id === categoryId &&
        category.workspaceId === workspaceId
    )

    if (!validCategory) return

    const validTagIds = selectedTagIds.filter((id) =>
      tags.some(
        (tag) =>
          tag.id === id &&
          tag.workspaceId === workspaceId
      )
    )

    const now = new Date()
    const progressionStartValue = autoProgressionEnabled
      ? scheduleType === 'duration'
        ? now
        : new Date(autoStartAt)
      : null
    const progressionEndValue = autoProgressionEnabled
      ? scheduleType === 'duration'
        ? new Date(now.getTime() + Number(durationHours) * 60 * 60 * 1000)
        : new Date(autoEndAt)
      : null
    if (autoProgressionEnabled && (
      !progressionStartValue || !Number.isFinite(progressionStartValue.getTime()) ||
      !progressionEndValue || !Number.isFinite(progressionEndValue.getTime()) ||
      progressionEndValue.getTime() <= progressionStartValue.getTime() ||
      (scheduleType === 'duration' && (!Number.isFinite(Number(durationHours)) || Number(durationHours) <= 0))
    )) return



    onSave(task.id, {
      title: trimmedTitle,
      description,
      workspaceId,
      categoryId,
      priority,
      status,
      dueDate: dueDate || null,
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
      autoProgressionEnabled,
      autoProgressionStartAt: progressionStartValue?.toISOString() ?? null,
      autoProgressionEndAt: progressionEndValue?.toISOString() ?? null,
      checklist,
      tagIds: validTagIds,
      completedAt:
        status === 'Completed'
          ? task.completedAt ?? new Date().toISOString()
          : null,
    })

    onClose()
  }

  const addChecklistItem = () => {
    const text = newItem.trim()
    if (!text) return

    setChecklist((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
      },
    ])

    setNewItem('')
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    )
  }

  const deleteChecklistItem = (id: string) => {
    setChecklist((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[var(--tn-overlay)]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Close task details"
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--tn-border)] bg-[var(--tn-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--tn-text-subtle)]">
              Task details
            </p>
            <p className="mt-1 text-sm text-[var(--tn-text-muted)]">
              Edit and manage your task
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--tn-text-muted)] hover:bg-white/10 hover:text-[var(--tn-text)]"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-7 overflow-y-auto p-6">
            {/* Title */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                Task title
              </label>

              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3 text-base font-medium text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this task..."
                rows={5}
                className="w-full resize-y rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3 text-sm text-[var(--tn-text)] outline-none placeholder:text-[var(--tn-text-subtle)] focus:border-[var(--tn-primary)]"
              />
            </div>

            {/* Workspace and category */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                  Workspace
                </label>

                <select
                  value={workspaceId}
                  onChange={(e) =>
                    handleWorkspaceChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                >
                  {workspaces.map((workspace) => (
                    <option
                      key={workspace.id}
                      value={workspace.id}
                    >
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                  Category
                </label>

                <CategoryTreeSelect
                  options={categoryOptions}
                  categories={categories}
                  value={categoryId}
                  onChange={setCategoryId}
                  disabled={categoryOptions.length === 0}
                />

                {categoryOptions.length === 0 && (
                  <p className="mt-2 text-xs text-amber-400">
                    This workspace has no categories. Create a
                    category before moving this task here.
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                  <TagIcon size={15} />
                  Tags
                </label>

                <span className="text-xs text-[var(--tn-text-subtle)]">
                  {selectedTagIds.length} selected
                </span>
              </div>

              {workspaceTags.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-5 text-center">
                  <TagIcon
                    size={20}
                    className="mx-auto mb-2 text-[var(--tn-text-subtle)]"
                  />
                  <p className="text-sm text-[var(--tn-text-muted)]">
                    No tags available
                  </p>
                  <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">
                    Create tags using Manage Tags in this workspace.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {workspaceTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        aria-pressed={isSelected}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition"
                        style={{
                          color: tag.color,
                          borderColor: isSelected
                            ? tag.color
                            : `${tag.color}55`,
                          backgroundColor: isSelected
                            ? `${tag.color}25`
                            : `${tag.color}0d`,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}

                        {isSelected && <Check size={13} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Status and priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TaskStatus)
                  }
                  className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as TaskPriority)
                  }
                  className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                <CalendarDays size={14} />
                Due date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
              />
            </div>

            {/* Optional one-off reminder */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                Reminder (optional)
              </label>
              <input
                type="datetime-local"
                value={reminderAt}
                min={(() => { const now = new Date(clockNow); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16) })()}
                onChange={(event) => setReminderAt(event.target.value)}
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
              />
              <p className="mt-1.5 text-xs text-[var(--tn-text-subtle)]">Leave empty to remove this task's individual reminder.</p>
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
                <div className="mt-4 border-t border-[var(--tn-border)] pt-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tn-text-subtle)]">Schedule type</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--tn-surface)] p-1">
                      <button type="button" onClick={() => setScheduleType('duration')} className={`rounded-lg px-3 py-2.5 text-xs font-medium transition ${scheduleType === 'duration' ? 'bg-[var(--tn-primary)] text-white shadow-sm' : 'text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'}`}>Duration from save</button>
                      <button type="button" onClick={() => setScheduleType('end')} className={`rounded-lg px-3 py-2.5 text-xs font-medium transition ${scheduleType === 'end' ? 'bg-[var(--tn-primary)] text-white shadow-sm' : 'text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'}`}>Set start &amp; end</button>
                    </div>
                  </div>
                  {scheduleType === 'duration' ? (
                    <div className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-3">
                      <label className="block text-xs font-medium text-[var(--tn-text-muted)]">Duration (hours)
                        <input type="number" min="0.01" step="any" required={autoProgressionEnabled} value={durationHours} onChange={(event) => setDurationHours(event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-sm text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/15" />
                      </label>
                      <p className="mt-2 text-xs text-[var(--tn-text-subtle)]">The countdown begins as soon as you save this task.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-3 text-xs font-medium text-[var(--tn-text-muted)]">
                          <span className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--tn-primary)]/10 text-[var(--tn-primary)]">1</span>Start date &amp; time</span>
                          <input type="datetime-local" required={autoProgressionEnabled} value={autoStartAt} onChange={(event) => setAutoStartAt(event.target.value)} className="mt-3 w-full min-w-0 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-sm font-normal text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/15" />
                          <span className="mt-2 block text-[11px] font-normal text-[var(--tn-text-subtle)]">When the timer begins</span>
                        </label>
                        <label className="block rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-3 text-xs font-medium text-[var(--tn-text-muted)]">
                          <span className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--tn-primary)]/10 text-[var(--tn-primary)]">2</span>End date &amp; time</span>
                          <input type="datetime-local" required={autoProgressionEnabled} min={autoStartAt || undefined} value={autoEndAt} onChange={(event) => setAutoEndAt(event.target.value)} className="mt-3 w-full min-w-0 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-sm font-normal text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/15" />
                          <span className="mt-2 block text-[11px] font-normal text-[var(--tn-text-subtle)]">Task completes automatically</span>
                        </label>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg bg-[var(--tn-primary)]/5 px-3 py-2.5 text-xs text-[var(--tn-text-muted)]">
                        <CalendarDays size={15} className="mt-0.5 shrink-0 text-[var(--tn-primary)]" />
                        <span>The countdown runs between these two times. The task will be marked complete when the end time is reached.</span>
                      </div>
                    </div>
                  )}
                  {task.autoProgressionEnabled && task.status !== 'Completed' && progressionEnd !== null && progressionStart !== null && (
                    <div className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--tn-text)]">Live progress</span>
                        <span className="text-[var(--tn-text-muted)]">{Math.round(progressionPercent)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--tn-border)]"><div className="h-full rounded-full bg-[var(--tn-primary)] transition-[width] duration-500" style={{ width: `${progressionPercent}%` }} /></div>
                      <p className="mt-2 text-xs text-[var(--tn-text-muted)]">{remainingMs > 0 ? `${formatRemaining(remainingMs)} remaining` : 'Time expired — completing task.'}</p>
                      <p className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">Ends {new Date(progressionEnd).toLocaleString()}</p>
                    </div>
                  )}
                  <p className="text-xs text-[var(--tn-text-subtle)]">Changing the schedule restarts its timer when you save.</p>
                </div>
              )}
            </section>

            {/* Checklist */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
                  <ListChecks size={15} />
                  Checklist
                </label>

                <span className="text-xs text-[var(--tn-text-subtle)]">
                  {completedItems}/{checklist.length} completed
                </span>
              </div>

              {checklist.length > 0 && (
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--tn-primary)] transition-all"
                    style={{
                      width: `${
                        (completedItems / checklist.length) * 100
                      }%`,
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className={
                        item.completed
                          ? 'text-emerald-400'
                          : 'text-[var(--tn-text-subtle)] hover:text-indigo-400'
                      }
                      aria-label={
                        item.completed
                          ? 'Mark checklist item incomplete'
                          : 'Complete checklist item'
                      }
                    >
                      {item.completed ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Circle size={17} />
                      )}
                    </button>

                    <span
                      className={`min-w-0 flex-1 text-sm ${
                        item.completed
                          ? 'text-[var(--tn-text-subtle)] line-through'
                          : 'text-[var(--tn-text-muted)]'
                      }`}
                    >
                      {item.text}
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteChecklistItem(item.id)}
                      className="text-[var(--tn-text-subtle)] opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                      aria-label="Delete checklist item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addChecklistItem()
                    }
                  }}
                  placeholder="Add a checklist item..."
                  className="min-w-0 flex-1 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-2.5 text-sm text-[var(--tn-text)] outline-none placeholder:text-[var(--tn-text-subtle)] focus:border-[var(--tn-primary)]"
                />

                <button
                  type="button"
                  onClick={addChecklistItem}
                  disabled={!newItem.trim()}
                  className="rounded-lg border border-[var(--tn-border)] px-3 text-[var(--tn-text-muted)] hover:bg-white/5 disabled:opacity-30"
                  aria-label="Add checklist item"
                >
                  <Plus size={17} />
                </button>
              </div>
            </section>

            {/* Metadata */}
            <div className="border-t border-[var(--tn-border)] pt-4 text-xs text-[var(--tn-text-subtle)]">
              <p>
                Created:{' '}
                {new Date(task.createdAt).toLocaleDateString()}
              </p>

              <p className="mt-1">
                Last updated:{' '}
                {new Date(task.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--tn-border)] px-6 py-4">
            <button
              type="button"
              onClick={() => {
                onDelete(task.id)
                onClose()
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={15} />
              Delete task
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[var(--tn-border)] px-4 py-2 text-sm text-[var(--tn-text-muted)] hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  !title.trim() ||
                  !workspaceId ||
                  !categoryId ||
                  (autoProgressionEnabled && (scheduleType === 'duration'
                    ? !Number.isFinite(Number(durationHours)) || Number(durationHours) <= 0
                    : !autoEndAt || new Date(autoEndAt).getTime() <= clockNow))
                }
                className="flex items-center gap-2 rounded-lg bg-[var(--tn-primary)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--tn-primary-hover)] disabled:opacity-40"
              >
                <Check size={15} />
                Save changes
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  )
}
