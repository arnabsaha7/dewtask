
import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'

import {
  CalendarDays,
  Circle,
  Clock3,
  CheckCircle2,
  Tag as TagIcon,
} from 'lucide-react'

import type { Task, Category, TaskStatus, Tag } from '../../types'
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
  viewMode: 'list' | 'board'
  onViewModeChange: (view: 'list' | 'board') => void
  onFolderView?: () => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onSelectTask: (task: Task) => void
  onManageTags: () => void
}

const columns: {
  status: TaskStatus
  label: string
  icon: typeof Circle
  color: string
}[] = [
  {
    status: 'To Do',
    label: 'To Do',
    icon: Circle,
    color: 'text-[var(--tn-text-muted)]',
  },
  {
    status: 'In Progress',
    label: 'In Progress',
    icon: Clock3,
    color: 'text-[var(--tn-primary)]',
  },
  {
    status: 'Completed',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-400',
  },
]

const priorityStyles: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-yellow-500/10 text-yellow-400',
  Low: 'bg-emerald-500/10 text-emerald-400',
}

function getTodayString() {
  const today = new Date()

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function KanbanBoard({
  tasks,
  categories,
  tags,
  settings,
  selectedTagIds,
  onSelectedTagIdsChange,
  activeNav,
  selectedCategoryId,
  selectedWorkspaceId,
  viewMode,
  onViewModeChange,
  onFolderView,
  onUpdateTask,
  onSelectTask,
  onManageTags,
}: Props) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // Workspace filter
    if (selectedWorkspaceId) {
      result = result.filter(
        (task) => task.workspaceId === selectedWorkspaceId
      )
    }

    // Category filter, including nested categories
    if (selectedCategoryId) {
      const categoryIds = [
        selectedCategoryId,
        ...getDescendantIds(categories, selectedCategoryId),
      ]

      result = result.filter((task) =>
        categoryIds.includes(task.categoryId)
      )
    } else if (activeNav === 'Today') {
      const today = getTodayString()

      result = result.filter((task) => task.dueDate === today)
    } else if (activeNav === 'Upcoming') {
      const today = getTodayString()

      result = result.filter(
        (task) => task.dueDate !== null && task.dueDate > today
      )
    }

    // Tag filter: show tasks matching ANY selected tag
    if (selectedTagIds.length > 0) {
      result = result.filter((task) =>
        selectedTagIds.some((tagId) => task.tagIds?.includes(tagId))
      )
    }

    if (!settings.showCompletedTasks) {
      result = result.filter((task) => task.status !== 'Completed')
    }

    const priorityOrder: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    }

    result.sort((a, b) => {
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

    return result
  }, [
    tasks,
    categories,
    activeNav,
    selectedCategoryId,
    selectedWorkspaceId,
    selectedTagIds,
    settings.showCompletedTasks,
    settings.defaultSort,
  ])

  // Drag and drop handlers
  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    taskId: string
  ) => {
    setDraggedTaskId(taskId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragOver = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus
  ) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus
  ) => {
    event.preventDefault()

    const taskId =
      event.dataTransfer.getData('text/plain') || draggedTaskId

    if (taskId) {
      const task = tasks.find((item) => item.id === taskId)

      if (task && task.status !== status) {
        onUpdateTask(taskId, {
          status,
          completedAt:
            status === 'Completed'
              ? new Date().toISOString()
              : null,
        })
      }
    }

    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  const visibleColumns = columns.filter(
    (column) => settings.showCompletedTasks || column.status !== 'Completed'
  )

  return (
    <div className="min-w-0 flex-1 p-6 lg:p-8">
      {/* Board header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--tn-text-muted)]">
            {filteredTasks.length} tasks across {visibleColumns.length} statuses
          </p>
        </div>

        {/* Header actions */}
        <div className="flex flex-wrap items-center gap-3">
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTagIds}
            onChange={onSelectedTagIdsChange}
          />

          {(selectedWorkspaceId || selectedCategoryId) && (
            <button
              type="button"
              onClick={onManageTags}
              className="flex items-center gap-2 rounded-lg border border-[var(--tn-border)] px-3 py-2 text-sm text-[var(--tn-text-muted)] transition hover:border-[var(--tn-primary)]/50 hover:bg-[var(--tn-primary-soft)] hover:text-[var(--tn-text)]"
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

      {/* Kanban columns */}
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
        {visibleColumns.map((column) => {
          const Icon = column.icon

          const columnTasks = filteredTasks.filter(
            (task) => task.status === column.status
          )

          const isDropTarget = dragOverStatus === column.status

          return (
            <section
              key={column.status}
              onDragOver={(event) =>
                handleDragOver(event, column.status)
              }
              onDrop={(event) =>
                handleDrop(event, column.status)
              }
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node
                  )
                ) {
                  setDragOverStatus(null)
                }
              }}
              className={`min-h-[420px] rounded-xl border p-3 transition ${
                isDropTarget
                  ? 'border-[var(--tn-primary)]/60 bg-[var(--tn-primary-soft)]'
                  : 'border-[var(--tn-border)] bg-[var(--tn-surface)]'
              }`}
            >
              {/* Column heading */}
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Icon size={16} className={column.color} />

                  <h2 className="text-sm font-semibold text-[var(--tn-text)]">
                    {column.label}
                  </h2>

                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-[var(--tn-text-muted)]">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Task cards */}
              <div className="space-y-3">
                {columnTasks.map((task) => {
                  const category = categories.find(
                    (item) => item.id === task.categoryId
                  )

                  const dueDate = task.dueDate
                    ? formatTaskDate(task.dueDate, settings.dateFormat, { includeYear: false })
                    : null

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) =>
                        handleDragStart(event, task.id)
                      }
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-4 transition hover:border-white/20 hover:bg-[var(--tn-surface-muted)] active:cursor-grabbing ${
                        draggedTaskId === task.id
                          ? 'opacity-40'
                          : 'opacity-100'
                      }`}
                    >
                      {/* Priority and due date */}
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                            priorityStyles[task.priority] ?? ''
                          }`}
                        >
                          {task.priority}
                        </span>

                        {dueDate && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--tn-text-subtle)]">
                            <CalendarDays size={12} />
                            {dueDate}
                          </span>
                        )}
                      </div>

                      {/* Task title */}
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className={`mb-2 block w-full text-left text-sm font-medium transition hover:text-[var(--tn-primary)] ${
                          task.status === 'Completed'
                            ? 'text-[var(--tn-text-subtle)] line-through'
                            : 'text-[var(--tn-text)]'
                        }`}
                      >
                        {task.title}
                      </button>

                      {/* Description */}
                      {task.description && (
                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--tn-text-subtle)]">
                          {task.description}
                        </p>
                      )}

                      <AutoProgressIndicator task={task} />

                      {/* Category */}
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--tn-border)] pt-3">
                        <span className="truncate text-xs text-[var(--tn-text-subtle)]">
                          {category?.name ?? 'Uncategorized'}
                        </span>

                        <span className="text-[10px] text-[var(--tn-text-subtle)]">
                          Drag to move
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Empty column */}
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--tn-border)] px-3 py-10 text-center">
                    <p className="text-xs text-[var(--tn-text-subtle)]">
                      Drop tasks here
                    </p>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
