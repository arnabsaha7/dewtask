
import { useEffect, useState } from 'react'
import { getTaskNestIdentity } from '../../services/identity'

import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  ListTodo,
  Gamepad2,
  Code2,
  BookOpen,
  User,
  Sparkles,
} from 'lucide-react'

import type { ComponentType } from 'react'
import type { Category, Task, Workspace } from '../../types'
import StatCard from './StatCard'
import GraphCards from './GraphCards'

interface Props {
  tasks: Task[]
  workspaces: Workspace[]
  categories: Category[]
  onToggleTask: (id: string) => void
  onViewAll: () => void
  onSelectWorkspace: (workspace: Workspace) => void
  onNavigateCalendar: () => void
}

const priorityStyles = {
  Critical: 'text-[var(--tn-priority-critical)] bg-[var(--tn-priority-critical)]/10',
  High: 'text-[var(--tn-priority-high)] bg-[var(--tn-priority-high)]/10',
  Medium: 'text-[var(--tn-priority-medium)] bg-[var(--tn-priority-medium)]/10',
  Low: 'text-[var(--tn-priority-low)] bg-[var(--tn-priority-low)]/10',
}

const workspaceIcons: Record<
  string,
  ComponentType<{ size?: number; className?: string }>
> = {
  gamepad: Gamepad2,
  code: Code2,
  book: BookOpen,
  user: User,
}

const workspaceColors = [
  'var(--tn-chart-category-1)',
  'var(--tn-chart-category-2)',
  'var(--tn-chart-category-3)',
  'var(--tn-chart-category-4)',
]

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

export default function Dashboard({
  tasks,
  workspaces,
  categories,
  onToggleTask,
  onViewAll,
  onSelectWorkspace,
}: Props) {
  const [greeting, setGreeting] = useState(getTimeBasedGreeting)
  const [clockNow, setClockNow] = useState(() => new Date())
  const [displayName, setDisplayName] = useState('')
  const [range, setRange] = useState<'week' | 'month' | 'all'>('week')
  const today = clockNow
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const rangeLabel = range === 'week' ? 'This week' : range === 'month' ? 'This month' : 'All time'
  const rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (range === 'week') {
    const day = (rangeStart.getDay() + 6) % 7
    rangeStart.setDate(rangeStart.getDate() - day)
  } else if (range === 'month') {
    rangeStart.setDate(1)
  }
  const visibleTasks = range === 'all' ? tasks : tasks.filter((task) => {
    const rawDate = task.createdAt || task.updatedAt || task.dueDate
    if (!rawDate) return false
    const taskDate = new Date(rawDate)
    return !Number.isNaN(taskDate.getTime()) && taskDate >= rangeStart && taskDate <= today
  })

  // Load the account display name and keep it in sync with Profile edits.
  useEffect(() => {
    let active = true

    const loadDisplayName = async () => {
      try {
        const identity = await getTaskNestIdentity()
        if (active) {
          setDisplayName(identity.account.displayName?.trim() ?? '')
        }
      } catch (error) {
        console.error('Could not load the account display name:', error)
      }
    }

    const handleIdentityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ displayName?: string | null }>
      setDisplayName(customEvent.detail?.displayName?.trim() ?? '')
    }

    void loadDisplayName()
    window.addEventListener('tasknest:identity-updated', handleIdentityUpdate)

    return () => {
      active = false
      window.removeEventListener('tasknest:identity-updated', handleIdentityUpdate)
    }
  }, [])

  // Refresh periodically so the greeting also changes if the dashboard stays open.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockNow(new Date())
      setGreeting(getTimeBasedGreeting())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const completed = visibleTasks.filter(
    (task) => task.status === 'Completed',
  ).length

  const inProgress = visibleTasks.filter(
    (task) => task.status === 'In Progress',
  ).length

  const pending = visibleTasks.filter(
    (task) => task.status === 'To Do',
  ).length

  const completionPercentage = visibleTasks.length
    ? Math.round((completed / visibleTasks.length) * 100)
    : 0

  const getWorkspaceName = (workspaceId: string) =>
    workspaces.find((workspace) => workspace.id === workspaceId)?.name ??
    'Unknown workspace'

  const getCategoryName = (categoryId: string) =>
    categories.find((category) => category.id === categoryId)?.name ??
    'Uncategorized'

  return (
    <div className="app-shell min-h-full w-full space-y-7 p-4 sm:p-6 xl:p-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tn-text)]">
            {displayName
              ? `${greeting}, ${displayName.trim().split(/\\s+/)[0]}!`
              : `${greeting}!`}
          </h1>

          <p className="mt-1 text-xs text-[var(--tn-text-muted)]">{dateLabel}</p>
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--tn-text-muted)]">
          <CalendarDays size={14} />
          <span className="sr-only">Dashboard date range</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as 'week' | 'month' | 'all')}
            className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
          >
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
        </label>
      </section>

      <section className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--tn-text)]">
              Overall progress
            </h3>
            <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">
              Completion · {rangeLabel}
            </p>
          </div>

          <span className="text-xl font-semibold text-[var(--tn-text)]">
            {completionPercentage}%
          </span>
        </div>

        <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-[var(--tn-surface-muted)]">
          <div
            className="transition-all"
            style={{
              width: `${visibleTasks.length ? (completed / visibleTasks.length) * 100 : 0}%`,
              backgroundColor: 'var(--tn-status-completed)',
            }}
          />
          <div
            className="transition-all"
            style={{
              width: `${visibleTasks.length ? (inProgress / visibleTasks.length) * 100 : 0}%`,
              backgroundColor: 'var(--tn-status-progress)',
            }}
          />
          <div
            className="transition-all"
            style={{
              width: `${visibleTasks.length ? (pending / visibleTasks.length) * 100 : 0}%`,
              backgroundColor: 'var(--tn-status-todo)',
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-5 text-[11px] text-[var(--tn-text-subtle)]">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--tn-status-completed)' }} />
            Completed ({completed})
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--tn-status-progress)' }} />
            In progress ({inProgress})
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--tn-status-todo)' }} />
            To do ({pending})
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tasks"
          value={visibleTasks.length}
          note={rangeLabel}
          icon={ListTodo}
          tone="primary"
        />

        <StatCard
          label="Completed"
          value={completed}
          note={rangeLabel}
          icon={CircleCheck}
          tone="success"
        />

        <StatCard
          label="In progress"
          value={inProgress}
          note={rangeLabel}
          icon={Activity}
          tone="info"
        />

        <StatCard
          label="To do"
          value={pending}
          note={rangeLabel}
          icon={Clock3}
          tone="warning"
        />
      </section>

      <GraphCards tasks={visibleTasks} allTasks={tasks} categories={categories} range={range} rangeLabel={rangeLabel} now={today} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--tn-text)]">
                Recent tasks
              </h3>
              <p className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">
                Latest activity · {rangeLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={onViewAll}
              className="flex items-center gap-1 text-xs font-medium text-[var(--tn-primary)] hover:opacity-80"
            >
              View all <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-[var(--tn-border)]">
            {visibleTasks.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-[var(--tn-text-subtle)]">
                No tasks yet. Create your first task to get started.
              </p>
            )}

            {visibleTasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-[var(--tn-surface-muted)]"
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  title="Toggle completion"
                  className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border transition ${
                    task.status === 'Completed'
                      ? 'border-[var(--tn-status-completed)] bg-[var(--tn-status-completed)] text-white'
                      : 'border-[var(--tn-border-strong)] text-transparent hover:border-[var(--tn-primary)]'
                  }`}
                >
                  {task.status === 'Completed' && <Check size={11} />}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[13px] ${
                      task.status === 'Completed'
                        ? 'text-[var(--tn-text-subtle)] line-through'
                        : 'text-[var(--tn-text)]'
                    }`}
                  >
                    {task.title}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-[var(--tn-text-subtle)]">
                    {getWorkspaceName(task.workspaceId)}
                    <span className="mx-1.5 text-[var(--tn-text-subtle)]">/</span>
                    {getCategoryName(task.categoryId)}
                  </p>
                </div>

                <span
                  className={`hidden rounded-md px-2 py-1 text-[10px] font-medium sm:inline-block ${priorityStyles[task.priority]}`}
                >
                  {task.priority}
                </span>

                <span className="w-16 shrink-0 text-right text-[10px] text-[var(--tn-text-subtle)]">
                  {task.dueDate ?? 'No date'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--tn-text)]">Workspaces</h3>
              <p className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">
                Your areas of focus · {rangeLabel}
              </p>
            </div>

            <div className="space-y-4">
              {workspaces.map((workspace, index) => {
                const Icon = workspaceIcons[workspace.icon] ?? User

                const count = visibleTasks.filter(
                  (task) => task.workspaceId === workspace.id,
                ).length

                const workspaceTaskCount = visibleTasks.filter(
                  (task) => task.workspaceId === workspace.id,
                ).length

                const completedCount = visibleTasks.filter(
                  (task) =>
                    task.workspaceId === workspace.id &&
                    task.status === 'Completed',
                ).length

                const progress = workspaceTaskCount
                  ? (completedCount / workspaceTaskCount) * 100
                  : 0

                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => onSelectWorkspace(workspace)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tn-surface-muted)]">
                      <Icon size={17} className="text-[var(--tn-text-muted)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--tn-text)]">
                        {workspace.name}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--tn-text-subtle)]">
                        {count} {count === 1 ? "task" : "tasks"}
                      </p>
                    </div>

                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--tn-surface-muted)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: workspaceColors[index % workspaceColors.length],
                        }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="reminder-card rounded-xl border p-5">
            <div className="flex items-center gap-2 text-[var(--tn-primary)]">
              <Sparkles size={16} />
              <span className="text-xs font-semibold">A little reminder</span>
            </div>

            <p className="mt-3 text-sm font-medium text-[var(--tn-text)]">
              Make progress, not just plans.
            </p>

            <p className="mt-1 text-xs leading-relaxed text-[var(--tn-text-muted)]">
              Pick one important task and give it your attention today.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
