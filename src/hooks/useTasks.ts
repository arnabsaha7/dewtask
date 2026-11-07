
import { useEffect } from 'react'
import { usePersistentValue } from './usePersistentValue'
import type { Task } from '../types'
import { initialTasks } from '../data/initialData'

function reconcileAutoProgressionTasks(
  tasks: Task[],
  now = Date.now()
): Task[] {
  let changed = false

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

    // Scheduled end: automatically complete the task.
    if (endAt <= now) {
      changed = true

      return {
        ...task,
        status: 'Completed' as const,
        completedAt: task.completedAt ?? task.autoProgressionEndAt,
        updatedAt: timestamp,
      }
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

  return changed ? updated : tasks
}

export function useTasks() {
  const [storedTasks, setTasks, isHydrated] = usePersistentValue<Task[]>(
    'tasknest_tasks',
    initialTasks
  )

  const tasks = reconcileAutoProgressionTasks(storedTasks)

  useEffect(() => {
    const checkAutoProgression = () => {
      setTasks((current) =>
        reconcileAutoProgressionTasks(current)
      )
    }

    checkAutoProgression()

    const interval = window.setInterval(
      checkAutoProgression,
      1000
    )

    window.addEventListener('focus', checkAutoProgression)
    document.addEventListener(
      'visibilitychange',
      checkAutoProgression
    )

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkAutoProgression)
      document.removeEventListener(
        'visibilitychange',
        checkAutoProgression
      )
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
    scheduledStart?: string | null
    scheduledEnd?: string | null
    autoProgressionEnabled?: boolean
    autoProgressionStartAt?: string | null
    autoProgressionEndAt?: string | null
  }) => {
    const now = new Date().toISOString()

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description ?? '',
      workspaceId: data.workspaceId,
      categoryId: data.categoryId,
      priority: data.priority,
      status: data.status ?? 'To Do',
      dueDate: data.dueDate ?? null,
      reminderAt: data.reminderAt ?? null,
      scheduledStart: data.scheduledStart ?? null,
      scheduledEnd: data.scheduledEnd ?? null,
      checklist: [],
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      autoProgressionEnabled: data.autoProgressionEnabled ?? false,
      autoProgressionStartAt: data.autoProgressionStartAt ?? null,
      autoProgressionEndAt: data.autoProgressionEndAt ?? null,
    }

    setTasks((current) => [...current, newTask])
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((current) =>
      reconcileAutoProgressionTasks(
        current.map((task) =>
          task.id === id
            ? {
                ...task,
                ...updates,
                id: task.id,
                updatedAt: new Date().toISOString(),
              }
            : task
        )
      )
    )
  }

  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task

        const completing = task.status !== 'Completed'
        const now = new Date().toISOString()

        return {
          ...task,
          status: completing ? 'Completed' : 'To Do',
          completedAt: completing ? now : null,
          updatedAt: now,
        }
      })
    )
  }

  const deleteTask = (id: string) =>
    setTasks((current) =>
      current.filter((task) => task.id !== id)
    )

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
