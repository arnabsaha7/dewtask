import {
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Trash2,
} from 'lucide-react'

import type { Task, Category } from '../../types'

interface Props {
  tasks: Task[]
  categories: Category[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onSelectTask: (task: Task) => void
}

const priorityStyles: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-amber-500/10 text-amber-400',
  Low: 'bg-emerald-500/10 text-emerald-400',
}

const statusStyles: Record<string, string> = {
  'To Do': 'text-[var(--tn-text-muted)]',
  'In Progress': 'text-[var(--tn-primary)]',
  Completed: 'text-emerald-500',
}

function formatDate(date: string | null) {
  if (!date) return 'No due date'

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return 'No due date'

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function WorkspaceList({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--tn-border)] bg-[var(--tn-surface)] px-6 py-16 text-center">
        <p className="text-sm font-medium text-[var(--tn-text)]">
          No tasks found
        </p>
        <p className="mt-1 text-xs text-[var(--tn-text-muted)]">
          Create a task or adjust your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">
      <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_130px_40px] gap-4 border-b border-[var(--tn-border)] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--tn-text-subtle)] md:grid">
        <span>Task</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Due date</span>
        <span />
      </div>

      {tasks.map((task) => {
        const category = categories.find(
          (item) => item.id === task.categoryId,
        )

        const completed = task.status === 'Completed'

        return (
          <div
            key={task.id}
            className="grid grid-cols-1 gap-3 border-b border-[var(--tn-border)] px-4 py-4 transition last:border-b-0 hover:bg-[var(--tn-surface-hover)] md:grid-cols-[minmax(0,1fr)_100px_120px_130px_40px] md:items-center md:gap-4 md:px-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => onToggleTask(task.id)}
                aria-label={
                  completed
                    ? `Mark ${task.title} incomplete`
                    : `Mark ${task.title} complete`
                }
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                  completed
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-[var(--tn-border)] text-transparent hover:border-[var(--tn-primary)]'
                }`}
              >
                {completed ? <Check size={12} /> : <Circle size={12} />}
              </button>

              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectTask(task)}
                  className={`block max-w-full truncate text-left text-sm font-medium transition hover:text-[var(--tn-primary)] ${
                    completed
                      ? 'text-[var(--tn-text-muted)] line-through'
                      : 'text-[var(--tn-text)]'
                  }`}
                >
                  {task.title}
                </button>

                {task.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--tn-text-muted)]">
                    {task.description}
                  </p>
                )}

                <p className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">
                  {category?.name ?? 'Uncategorized'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:block">
              <span className="text-[10px] uppercase text-[var(--tn-text-subtle)] md:hidden">
                Priority
              </span>
              <span
                className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-medium ${
                  priorityStyles[task.priority] ?? ''
                }`}
              >
                {task.priority}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs md:block">
              <span className="text-[10px] uppercase text-[var(--tn-text-subtle)] md:hidden">
                Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  statusStyles[task.status] ?? ''
                }`}
              >
                {task.status === 'To Do' && <Circle size={12} />}
                {task.status === 'In Progress' && <Clock3 size={12} />}
                {task.status === 'Completed' && <Check size={12} />}
                {task.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--tn-text-muted)]">
              <CalendarDays size={13} />
              {formatDate(task.dueDate)}
            </div>

            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              aria-label={`Delete ${task.title}`}
              title="Delete task"
              className="hidden rounded-lg p-2 text-[var(--tn-text-subtle)] transition hover:bg-red-500/10 hover:text-red-400 md:inline-flex"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}