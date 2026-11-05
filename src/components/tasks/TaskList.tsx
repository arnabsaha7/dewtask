
import { useMemo, useState } from 'react'

import {
  Check,
  Circle,
  Clock3,
  CalendarDays,
  Trash2,
  ListTodo,
  Tag as TagIcon,
} from 'lucide-react'

import type { Task, Category, Tag } from '../../types'
import { formatTaskDate, type TaskNestSettings } from '../../hooks/useSettings'
import { getDescendantIds } from '../../utils/categories'
import ViewSwitcher from '../common/ViewSwitcher'
import TagFilter from './TagFilter'
import AutoProgressIndicator from './AutoProgressIndicator'

interface Props {
  tasks: Task[]
  categories: Category[]
  tags: Tag[]
  settings: TaskNestSettings
  selectedTagIds: string[]
  onSelectedTagIdsChange: (tagIds: string[]) => void
  activeNav: string
  selectedCategoryId: string | null
  selectedWorkspaceId: string | null
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onSelectTask: (task: Task) => void
  viewMode: 'list' | 'board'
  onViewModeChange: (view: 'list' | 'board') => void
  onFolderView?: () => void
  onManageTags: () => void
}

const priorityStyles: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-yellow-500/10 text-yellow-400',
  Low: 'bg-emerald-500/10 text-emerald-400',
}

const statusStyles: Record<string, string> = {
  'To Do': 'text-[var(--tn-text-muted)]',
  'In Progress': 'text-blue-400',
  Completed: 'text-emerald-400',
}

function getTodayString() {
  const today = new Date()

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function TaskList({
  tasks,
  categories,
  tags,
  settings,
  selectedTagIds,
  onSelectedTagIdsChange,
  activeNav,
  selectedCategoryId,
  selectedWorkspaceId,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
  viewMode,
  onViewModeChange,
  onFolderView,
  onManageTags,
}: Props) {
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null)

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // Workspace filter
    if (selectedWorkspaceId) {
      result = result.filter(
        (task) => task.workspaceId === selectedWorkspaceId
      )
    }

    // Category filter, including all nested child categories
    if (selectedCategoryId) {
      const categoryIds = [
        selectedCategoryId,
        ...getDescendantIds(categories, selectedCategoryId),
      ]

      result = result.filter((task) =>
        categoryIds.includes(task.categoryId)
      )
    }

    // Today filter
    else if (activeNav === 'Today') {
      const todayString = getTodayString()

      result = result.filter(
        (task) => task.dueDate === todayString
      )
    }

    // Upcoming filter
    else if (activeNav === 'Upcoming') {
      const todayString = getTodayString()

      result = result.filter(
        (task) =>
          task.dueDate !== null &&
          task.dueDate > todayString
      )
    }

    // Tag filter: OR matching
    if (selectedTagIds.length > 0) {
      result = result.filter((task) =>
        selectedTagIds.some((tagId) =>
          task.tagIds?.includes(tagId)
        )
      )
    }

    // Apply the completed-task preference before sorting.
    if (!settings.showCompletedTasks) {
      result = result.filter((task) => task.status !== 'Completed')
    }

    const priorityOrder: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    }

    return result.sort((a, b) => {
      switch (settings.defaultSort) {
        case 'created':
          return b.createdAt.localeCompare(a.createdAt)
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.localeCompare(b.dueDate)
        case 'priority':
          return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
        case 'title':
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        default:
          return 0
      }
    })
  }, [
    tasks,
    categories,
    activeNav,
    selectedCategoryId,
    selectedWorkspaceId,
    selectedTagIds,
    settings.defaultSort,
    settings.showCompletedTasks,
  ])

  // Page title
  const title = selectedCategoryId
    ? categories.find(
        (category) => category.id === selectedCategoryId
      )?.name ?? 'Category Tasks'
    : activeNav

  const completedCount = filteredTasks.filter(
    (task) => task.status === 'Completed'
  ).length

  return (
    <div className="min-w-0 flex-1 p-6 lg:p-8">

      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--tn-text-subtle)]">
            <ListTodo size={15} />
            <span>Tasks</span>
          </div>

          <h1 className="text-2xl font-semibold text-[var(--tn-text)]">
            {title}
          </h1>

          <p className="mt-1 text-sm text-[var(--tn-text-muted)]">
            {filteredTasks.length} tasks · {completedCount} completed
          </p>
        </div>

        {/* Header actions */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Tag filter: ALWAYS available in List view */}
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTagIds}
            onChange={onSelectedTagIdsChange}
          />

          {/* Manage Tags: workspace/category context only */}
          {(selectedWorkspaceId || selectedCategoryId) && (
            <button
              type="button"
              onClick={onManageTags}
              className="flex items-center gap-2 rounded-lg border border-[var(--tn-border)] px-3 py-2 text-sm text-[var(--tn-text-muted)] transition hover:border-indigo-500/40 hover:bg-[var(--tn-primary)]/10 hover:text-indigo-300"
            >
              <TagIcon size={15} />
              Manage Tags
            </button>
          )}

          {onFolderView && selectedWorkspaceId && (
            <button
              type="button"
              onClick={onFolderView}
              className="rounded-lg border border-[var(--tn-border)] px-3 py-2 text-sm text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
            >
              Folders
            </button>
          )}
          <ViewSwitcher viewMode={viewMode} onChange={onViewModeChange} />

        </div>
      </div>

      {/* Task list */}
      <div className="overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">

        {/* Column headings */}
        <div className="grid grid-cols-[minmax(260px,1.7fr)_90px_125px_120px_36px] items-center gap-4 border-b border-[var(--tn-border)] px-6 py-3 text-xs font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
          <span>Task</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Due date</span>
          <span />
        </div>

        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const category = categories.find(
              (item) => item.id === task.categoryId
            )

            const isCompleted = task.status === 'Completed'

            return (
              <div
                key={task.id}
                className="group grid grid-cols-[minmax(260px,1.7fr)_90px_125px_120px_36px] items-center gap-4 border-b border-[var(--tn-border)] px-6 py-5 transition-colors hover:bg-[var(--tn-surface-hover)]/70 last:border-b-0"
              >

                {/* Task title */}
                <div className="flex min-w-0 items-start gap-4">

                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-[var(--tn-text)]'
                        : 'border-[var(--tn-border)] text-transparent hover:border-[var(--tn-primary)]'
                    }`}
                    title={
                      isCompleted
                        ? 'Mark incomplete'
                        : 'Mark complete'
                    }
                    aria-label={
                      isCompleted
                        ? `Mark ${task.title} incomplete`
                        : `Mark ${task.title} complete`
                    }
                  >
                    {isCompleted ? (
                      <Check size={12} />
                    ) : (
                      <Circle size={12} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectTask(task)}
                      className={`block max-w-full truncate text-left text-[15px] font-semibold tracking-[-0.01em] hover:text-[var(--tn-primary)] ${
                        isCompleted
                          ? 'text-[var(--tn-text-subtle)] line-through'
                          : 'text-[var(--tn-text)]'
                      }`}
                    >
                      {task.title}
                    </button>

                    <p className="mt-1.5 truncate text-xs text-[var(--tn-text-muted)]">
                      {category?.name ?? 'Uncategorized'}
                    </p>
                    <AutoProgressIndicator task={task} compact />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      priorityStyles[task.priority] ?? ''
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>

                {/* Status */}
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    statusStyles[task.status] ?? 'text-[var(--tn-text-muted)]'
                  }`}
                >
                  {task.status === 'In Progress' ? (
                    <Clock3 size={13} />
                  ) : (
                    <Circle size={12} />
                  )}

                  {task.status}
                </div>

                {/* Due date */}
                <div className="flex items-center gap-1.5 text-xs text-[var(--tn-text-muted)]">
                  <CalendarDays size={13} />
                  <span>{formatTaskDate(task.dueDate, settings.dateFormat)}</span>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => setTaskPendingDelete(task)}
                  className="rounded-md p-2 text-[var(--tn-text-subtle)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  title="Delete task"
                  aria-label={`Delete ${task.title}`}
                >
                  <Trash2 size={15} />
                </button>

              </div>
            )
          })
        ) : (

          /* Empty state */
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

            <div className="mb-4 rounded-xl bg-white/[0.04] p-4">
              <ListTodo size={28} className="text-[var(--tn-text-subtle)]" />
            </div>

            <h3 className="text-sm font-medium text-[var(--tn-text-muted)]">
              No tasks found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-[var(--tn-text-subtle)]">
              There are no tasks matching the current filters.
              Clear your tag filters or create a new task.
            </p>

          </div>
        )}

      </div>

      {taskPendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTaskPendingDelete(null)
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            aria-describedby="delete-task-description"
            className="w-full max-w-md rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <Trash2 size={20} />
            </div>
            <h2 id="delete-task-title" className="text-lg font-semibold text-[var(--tn-text)]">
              Delete this task?
            </h2>
            <p id="delete-task-description" className="mt-2 text-sm leading-6 text-[var(--tn-text-muted)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--tn-text)]">“{taskPendingDelete.title}”</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTaskPendingDelete(null)}
                className="rounded-lg border border-[var(--tn-border)] px-4 py-2.5 text-sm font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(taskPendingDelete.id)
                  setTaskPendingDelete(null)
                }}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete task
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
