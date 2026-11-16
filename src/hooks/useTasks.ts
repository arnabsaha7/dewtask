import { useEffect } from 'react'
import { usePersistentValue } from './usePersistentValue'
import type { RecurrenceRule, Task } from '../types'
import { initialTasks } from '../data/initialData'
import { buildNextRecurringTask } from '../utils/recurrence'

function spawnNextIfRecurring(
  completedTask: Task,
  deterministicId?: string,
): { archivedTask: Task; nextTask: Task | null } {
  if (!completedTask.recurrence) {
    return { archivedTask: completedTask, nextTask: null }
  }

  const nextTask = buildNextRecurringTask(completedTask)
  if (!nextTask) {
    return {
      archivedTask: { ...completedTask, recurrence: null },
      nextTask: null,
    }
  }

  return {
    archivedTask: {
      ...completedTask,
      recurrence: null,
    },
    nextTask: deterministicId ? { ...nextTask, id: deterministicId } : nextTask,
  }
}

function reconcileAutoProgressionTasks(
  tasks: Task[],
  now = Date.now(),
): Task[] {
  let changed = false
  const spawnedTasks: Task[] = []

  const updated = tasks.map((task) => {
    if (
      !task.autoProgressionEnabled ||
      task.status === 'Completed' ||
      !task.autoProgressionStartAt ||
      !task.autoProgressionEndAt
    ) {
      return task
    }

    const startAt = new Date(task.autoProgressionStartAt).getTime()
    const endAt = new Date(task.autoProgressionEndAt).getTime()

    if (
      !Number.isFinite(startAt) ||
      !Number.isFinite(endAt) ||
      endAt <= startAt
    ) {
      return task
    }

    const timestamp = new Date(now).toISOString()

    // Scheduled end: automatically complete the task and spawn next occurrence if recurring.
    if (endAt <= now) {
      changed = true

      const completedTask: Task = {
        ...task,
        status: 'Completed',
        completedAt: task.completedAt ?? task.autoProgressionEndAt,
        updatedAt: timestamp,
      }

      const seriesId = task.recurrenceSeriesId ?? task.id
      const nextOccurrenceNum = (task.recurrence?.occurrenceCount || 1) + 1
      const deterministicNextId = `${seriesId}-occ-${nextOccurrenceNum}`

      const { archivedTask, nextTask } = spawnNextIfRecurring(
        completedTask,
        deterministicNextId,
      )

      if (nextTask && !tasks.some((item) => item.id === nextTask.id)) {
        spawnedTasks.push(nextTask)
      }

      return archivedTask
    }

    // Scheduled start: move To Do tasks into In Progress.
    if (startAt <= now && task.status === 'To Do') {
      changed = true

      return {
        ...task,
        status: 'In Progress' as const,
        completedAt: null,
        updatedAt: timestamp,
      }
    }

    return task
  })

  if (!changed) return tasks
  return spawnedTasks.length > 0 ? [...spawnedTasks, ...updated] : updated
}

export function useTasks() {
  const [storedTasks, setTasks, isHydrated] = usePersistentValue<Task[]>(
    'tasknest_tasks',
    initialTasks,
  )

  const tasks = reconcileAutoProgressionTasks(storedTasks)

  useEffect(() => {
    const checkAutoProgression = () => {
      setTasks((current) => reconcileAutoProgressionTasks(current))
    }

    checkAutoProgression()

    const interval = window.setInterval(checkAutoProgression, 1000)

    window.addEventListener('focus', checkAutoProgression)
    document.addEventListener('visibilitychange', checkAutoProgression)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkAutoProgression)
      document.removeEventListener('visibilitychange', checkAutoProgression)
    }
  }, [setTasks])

  const addTask = (data: {
    title: string
    workspaceId: string
    categoryId: string
    priority: Task['priority']
    description?: string
    status?: Task['status']
    dueDate?: string | null
    reminderAt?: string | null
    recurrence?: RecurrenceRule | null
    recurrenceSeriesId?: string | null
    scheduledStart?: string | null
    scheduledEnd?: string | null
    autoProgressionEnabled?: boolean
    autoProgressionStartAt?: string | null
    autoProgressionEndAt?: string | null
  }) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const initialStatus = data.status ?? 'To Do'
    const hasRecurrence = Boolean(data.recurrence)

    const createdTask: Task = {
      id,
      title: data.title,
      description: data.description ?? '',
      workspaceId: data.workspaceId,
      categoryId: data.categoryId,
      priority: data.priority,
      status: initialStatus,
      dueDate: data.dueDate ?? null,
      reminderAt: data.reminderAt ?? null,
      recurrence: data.recurrence ?? null,
      recurrenceSeriesId: hasRecurrence
        ? (data.recurrenceSeriesId ?? id)
        : null,
      scheduledStart: data.scheduledStart ?? null,
      scheduledEnd: data.scheduledEnd ?? null,
      checklist: [],
      createdAt: now,
      updatedAt: now,
      completedAt: initialStatus === 'Completed' ? now : null,
      autoProgressionEnabled: data.autoProgressionEnabled ?? false,
      autoProgressionStartAt: data.autoProgressionStartAt ?? null,
      autoProgressionEndAt: data.autoProgressionEndAt ?? null,
    }

    // If a recurring task is created directly in 'Completed' state, immediately schedule the next occurrence.
    if (initialStatus === 'Completed' && createdTask.recurrence) {
      const { archivedTask, nextTask } = spawnNextIfRecurring(createdTask)
      setTasks((current) =>
        nextTask ? [...current, archivedTask, nextTask] : [...current, archivedTask],
      )
      return
    }

    setTasks((current) => [...current, createdTask])
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((current) => {
      const spawnedTasks: Task[] = []
      const now = new Date().toISOString()

      const nextList = current.map((task) => {
        if (task.id !== id) return task

        const merged: Task = {
          ...task,
          ...updates,
          id: task.id,
          updatedAt: now,
        }

        const isCompletingNow =
          task.status !== 'Completed' && merged.status === 'Completed'

        if (isCompletingNow && merged.recurrence) {
          const { archivedTask, nextTask } = spawnNextIfRecurring({
            ...merged,
            completedAt: merged.completedAt ?? now,
          })
          if (nextTask) spawnedTasks.push(nextTask)
          return archivedTask
        }

        return merged
      })

      const combined =
        spawnedTasks.length > 0 ? [...spawnedTasks, ...nextList] : nextList

      return reconcileAutoProgressionTasks(combined)
    })
  }

  const toggleTask = (id: string) => {
    setTasks((current) => {
      const spawnedTasks: Task[] = []
      const now = new Date().toISOString()

      const nextList = current.map((task) => {
        if (task.id !== id) return task

        const completing = task.status !== 'Completed'
        const toggled: Task = {
          ...task,
          status: completing ? 'Completed' : 'To Do',
          completedAt: completing ? now : null,
          updatedAt: now,
        }

        if (completing && toggled.recurrence) {
          const { archivedTask, nextTask } = spawnNextIfRecurring(toggled)
          if (nextTask) spawnedTasks.push(nextTask)
          return archivedTask
        }

        return toggled
      })

      return spawnedTasks.length > 0 ? [...spawnedTasks, ...nextList] : nextList
    })
  }

  const deleteTask = (id: string) =>
    setTasks((current) => current.filter((task) => task.id !== id))

  return {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    setTasks,
    isHydrated,
  }
}