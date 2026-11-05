
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  ListTodo,
  Sparkles,
  Gamepad2,
  Code2,
  BookOpen,
  User,
} from 'lucide-react'

import type { ComponentType } from 'react'
import type { Category, Task, Workspace } from '../../types'
import StatCard from './StatCard'

interface Props {
  tasks: Task[]
  workspaces: Workspace[]
  categories: Category[]
  onToggleTask: (id: string) => void
  onViewAll: () => void
  onSelectWorkspace: (workspace: Workspace) => void
}

const priorityStyles = {
  Critical: 'text-rose-400 bg-rose-400/10',
  High: 'text-orange-400 bg-orange-400/10',
  Medium: 'text-amber-400 bg-amber-400/10',
  Low: 'text-[var(--tn-text-muted)] bg-slate-400/10',
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
  'bg-violet-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-emerald-400',
]

export default function Dashboard({
  tasks,
  workspaces,
  categories,
  onToggleTask,
  onViewAll,
  onSelectWorkspace,
}: Props) {
  const completed = tasks.filter(
    (task) => task.status === 'Completed',
  ).length

  const inProgress = tasks.filter(
    (task) => task.status === 'In Progress',
  ).length

  const pending = tasks.filter(
    (task) => task.status === 'To Do',
  ).length

  const completionPercentage = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0

  const getWorkspaceName = (workspaceId: string) =>
    workspaces.find((workspace) => workspace.id === workspaceId)?.name ??
    'Unknown workspace'

  const getCategoryName = (categoryId: string) =>
    categories.find((category) => category.id === categoryId)?.name ??
    'Uncategorized'

  return (
    <div className="app-shell mx-auto min-h-full max-w-[1500px] space-y-7 p-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--tn-primary)]">
            <Sparkles size={14} />
            YOUR PERSONAL COMMAND CENTER
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tn-text)]">
            Good evening.
          </h1>

          <p className="mt-1 text-sm text-[var(--tn-text-subtle)]">
            Here's what's happening across your workspaces.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[var(--tn-border)] px-3 py-2 text-xs text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-muted)]"
        >
          <CalendarDays size={14} />
          This week
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tasks"
          value={tasks.length}
          note="Across all workspaces"
          icon={ListTodo}
          tone="primary"
        />

        <StatCard
          label="Completed"
          value={completed}
          note="Tasks finished"
          icon={CircleCheck}
          tone="success"
          trend="+2 this week"
        />

        <StatCard
          label="In progress"
          value={inProgress}
          note="Currently working on"
          icon={Activity}
          tone="info"
        />

        <StatCard
          label="To do"
          value={pending}
          note="Waiting to be started"
          icon={Clock3}
          tone="warning"
        />
      </section>

      <section className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--tn-text)]">
              Overall progress
            </h3>
            <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">
              Completion across all your tasks
            </p>
          </div>

          <span className="text-xl font-semibold text-[var(--tn-text)]">
            {completionPercentage}%
          </span>
        </div>

        <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-[var(--tn-surface-muted)]">
          <div
            className="bg-emerald-400 transition-all"
            style={{
              width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%`,
            }}
          />

          <div
            className="bg-indigo-400 transition-all"
            style={{
              width: `${tasks.length ? (inProgress / tasks.length) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-5 text-[11px] text-[var(--tn-text-subtle)]">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Completed ({completed})
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            In progress ({inProgress})
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--tn-border-strong)]" />
            To do ({pending})
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--tn-text)]">
                Recent tasks
              </h3>
              <p className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">
                Your latest activity across workspaces
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
            {tasks.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-[var(--tn-text-subtle)]">
                No tasks yet. Create your first task to get started.
              </p>
            )}

            {tasks.slice(0, 8).map((task) => (
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
                      ? 'border-emerald-400 bg-emerald-400 text-white'
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
                Your areas of focus
              </p>
            </div>

            <div className="space-y-4">
              {workspaces.map((workspace, index) => {
                const Icon = workspaceIcons[workspace.icon] ?? User

                const count = tasks.filter(
                  (task) => task.workspaceId === workspace.id,
                ).length

                const workspaceTaskCount = tasks.filter(
                  (task) => task.workspaceId === workspace.id,
                ).length

                const completedCount = tasks.filter(
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
                        {count} tasks
                      </p>
                    </div>

                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--tn-surface-muted)]">
                      <div
                        className={`h-full rounded-full ${workspaceColors[index % workspaceColors.length]}`}
                        style={{ width: `${progress}%` }}
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

      <footer className="flex items-center justify-between border-t border-[var(--tn-border)] pt-4 text-[10px] text-[var(--tn-text-subtle)]">
        <span>TaskNest · Your personal productivity space</span>
        <span>Frontend preview · v0.1</span>
      </footer>
    </div>
  )
}
