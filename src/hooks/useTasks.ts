import { useEffect } from 'react'
import { usePersistentValue } from './usePersistentValue'
import type { Task } from '../types'
import { initialTasks } from '../data/initialData'


function completeExpiredTasks(tasks: Task[], now = Date.now()): Task[] {
  let changed = false
  const updated = tasks.map((task) => {
    if (
      task.autoProgressionEnabled &&
      task.status !== 'Completed' &&
      task.autoProgressionEndAt &&
      new Date(task.autoProgressionEndAt).getTime() <= now
    ) {
      changed = true
      const completedAt = task.autoProgressionEndAt
      return { ...task, status: 'Completed' as const, completedAt, updatedAt: new Date(now).toISOString() }
    }
    return task
  })
  return changed ? updated : tasks
}

export function useTasks() {
  const [storedTasks, setTasks] = usePersistentValue<Task[]>('tasknest_tasks', initialTasks)
  const tasks = completeExpiredTasks(storedTasks)

  // Re-check deadlines periodically and immediately after the app becomes active.
  useEffect(() => {
    const checkDeadlines = () => setTasks((current) => completeExpiredTasks(current))
    const interval = window.setInterval(checkDeadlines, 1000)
    window.addEventListener('focus', checkDeadlines)
    document.addEventListener('visibilitychange', checkDeadlines)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkDeadlines)
      document.removeEventListener('visibilitychange', checkDeadlines)
    }
  }, [])

  const addTask = (data: {
    title: string
    workspaceId: string
    categoryId: string
    priority: Task['priority']
    description?: string
    status?: Task['status']
    dueDate?: string | null
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
      completeExpiredTasks(current.map((task) =>
        task.id === id
          ? { ...task, ...updates, id: task.id, updatedAt: new Date().toISOString() }
          : task
      ))
    )
  }

  const toggleTask = (id: string) => {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task
      const completing = task.status !== 'Completed'
      const now = new Date().toISOString()
      return { ...task, status: completing ? 'Completed' : 'To Do', completedAt: completing ? now : null, updatedAt: now }
    }))
  }

  const deleteTask = (id: string) => setTasks((current) => current.filter((task) => task.id !== id))

  return { tasks, addTask, updateTask, toggleTask, deleteTask, setTasks }
}
