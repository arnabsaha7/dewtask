import { useState } from 'react'
import type { DragEvent } from 'react'

import {
  Circle,
  Clock3,
  CheckCircle2,
} from 'lucide-react'

import type {
  Task,
  Category,
  TaskStatus,
} from '../../types'

import { Check, Trash2 } from 'lucide-react'

const columns: {
  status: TaskStatus
  label: string
  icon: typeof Circle
}[] = [
  {
    status: 'To Do',
    label: 'To Do',
    icon: Circle,
  },
  {
    status: 'In Progress',
    label: 'In Progress',
    icon: Clock3,
  },
  {
    status: 'Completed',
    label: 'Completed',
    icon: CheckCircle2,
  },
]

interface Props {
  tasks: Task[]
  categories: Category[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onSelectTask: (task: Task) => void
}

export default function WorkspaceBoard({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onSelectTask,
}: Props) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(
    null,
  )

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    taskId: string,
  ) => {
    setDraggedTaskId(taskId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragOver = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
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

  const clearDragState = () => {
    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
      {columns.map((column) => {
        const Icon = column.icon

        const columnTasks = tasks.filter(
          (task) => task.status === column.status,
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
                  event.relatedTarget as Node,
                )
              ) {
                setDragOverStatus(null)
              }
            }}
            className={`min-h-[420px] rounded-2xl border p-3 transition ${
              isDropTarget
                ? 'border-[var(--tn-primary)] bg-[var(--tn-primary-soft)]'
                : 'border-[var(--tn-border)] bg-[var(--tn-surface-muted)]'
            }`}
          >
            <div className="mb-4 flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <Icon
                  size={17}
                  className="text-[var(--tn-primary)]"
                />

                <h2 className="text-sm font-semibold text-[var(--tn-text)]">
                  {column.label}
                </h2>

                <span className="rounded-lg bg-[var(--tn-surface-hover)] px-2 py-0.5 text-xs text-[var(--tn-text-muted)]">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) =>
                    handleDragStart(event, task.id)
                  }
                  onDragEnd={clearDragState}
                  className={`cursor-grab active:cursor-grabbing ${
                    draggedTaskId === task.id
                      ? 'opacity-40'
                      : 'opacity-100'
                  }`}
                >
                  <article className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={task.status === 'Completed' ? 'Reopen task' : 'Complete task'}
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--tn-border)] text-[var(--tn-primary)]"
                      >
                        {task.status === 'Completed' && <Check size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className={`block text-sm font-medium ${task.status === 'Completed' ? 'text-[var(--tn-text-muted)] line-through' : 'text-[var(--tn-text)]'}`}>
                          {task.title}
                        </span>
                        {categories.find((category) => category.id === task.categoryId) && (
                          <span className="mt-1 block text-xs text-[var(--tn-text-muted)]">
                            {categories.find((category) => category.id === task.categoryId)?.name}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${task.title}`}
                        onClick={() => onDeleteTask(task.id)}
                        className="rounded-md p-1.5 text-[var(--tn-text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                </div>
              ))}

              {columnTasks.length === 0 && (
                <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-[var(--tn-border)] px-4 text-center">
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
  )
}