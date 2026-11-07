import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Task } from '../types'
import type { TaskNestSettings } from './useSettings'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export interface TaskNotification {
  id: string
  taskId: string
  title: string
  message: string
  kind: 'reminder' | 'due' | 'overdue'
  createdAt: string
  scheduledFor: string
  readAt: string | null
}

function dateAtLocalTime(dateOnly: string, time: string): Date | null {
  const [year, month, day] = dateOnly.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  const date = new Date(year, month - 1, day, hour, minute, 0, 0)
  return Number.isFinite(date.getTime()) ? date : null
}

function makeNotification(
  task: Task,
  kind: TaskNotification['kind'],
  id: string,
  scheduledFor: Date,
): TaskNotification {
  const messages = {
    reminder: 'Your task reminder is due.',
    due: 'This task is due today.',
    overdue: 'This task is overdue.',
  }
  return {
    id,
    taskId: task.id,
    title: task.title,
    message: messages[kind],
    kind,
    createdAt: new Date().toISOString(),
    scheduledFor: scheduledFor.toISOString(),
    readAt: null,
  }
}

interface NativeReminderPlan {
  id: number
  title: string
  body: string
  at: Date
  taskId: string
  eventKey: string
}

function nativeNotificationId(value: string): number {
  // Stable positive 31-bit FNV-1a identifier accepted by Android and iOS.
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 2_000_000_000 + 1
}

function buildNativePlan(tasks: Task[], settings: TaskNestSettings, now: Date): NativeReminderPlan[] {
  if (!settings.remindersEnabled) return []
  const plan: NativeReminderPlan[] = []
  const add = (task: Task, key: string, body: string, at: Date) => {
    if (at.getTime() <= now.getTime()) return
    plan.push({ id: nativeNotificationId(key), title: task.title, body, at, taskId: task.id, eventKey: key })
  }
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  for (const task of tasks) {
    if (task.status === 'Completed') continue
    if (task.reminderAt) {
      const reminderAt = new Date(task.reminderAt)
      if (Number.isFinite(reminderAt.getTime())) add(task, `reminder-${task.id}-${task.reminderAt}`, 'Your task reminder is due.', reminderAt)
    }
    if (!task.dueDate) continue

    if (settings.automaticDueDateReminders) {
      const dueAt = dateAtLocalTime(task.dueDate, settings.deadlineReminderTime || '09:00')
      if (dueAt) add(task, `due-${task.id}-${task.dueDate}`, 'This task is due today.', dueAt)
    }

    if (settings.automaticOverdueReminders && task.dueDate < today) {
      // Keep a rolling seven-day set of daily alerts. It is replenished on each
      // app launch/focus; this stays comfortably below iOS pending-notification limits.
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const overdueAt = dateAtLocalTime(dateKey, settings.deadlineReminderTime || '09:00')
        if (overdueAt) add(task, `overdue-${task.id}-${dateKey}`, 'This task is overdue.', overdueAt)
      }
    }
  }

  // iOS limits pending local notifications. Keep the 60 closest upcoming alerts.
  return plan.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60)
}

let nativeReconcileQueue: Promise<void> = Promise.resolve()

function reconcileNativeNotifications(tasks: Task[], settings: TaskNestSettings) {
  if (!Capacitor.isNativePlatform()) return
  const plan = buildNativePlan(tasks, settings, new Date())
  nativeReconcileQueue = nativeReconcileQueue.then(async () => {
    try {
      const permission = await LocalNotifications.checkPermissions()
      if (permission.display !== 'granted') return
      await LocalNotifications.cancelAll()
      if (plan.length === 0) return
      await LocalNotifications.schedule({
        notifications: plan.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          foreground: true,
          schedule: { at: item.at, allowWhileIdle: true },
          extra: { taskNestReminder: true, taskId: item.taskId, eventKey: item.eventKey },
          data: { taskNestReminder: true, taskId: item.taskId, eventKey: item.eventKey },
        })),
      })
    } catch (error) {
      console.error('Could not synchronize native TaskNest reminders:', error)
    }
  }).catch((error) => console.error('Native reminder synchronization failed:', error))
}

// Tapping a scheduled native alert routes the user to the matching task.
function useNativeNotificationActions() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    let removeListener: (() => void) | undefined
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const notification = event.notification as typeof event.notification & {
        data?: { taskId?: string }
        extra?: { taskId?: string }
      }
      const taskId = notification.data?.taskId ?? notification.extra?.taskId
      if (taskId) window.dispatchEvent(new CustomEvent('tasknest:open-task', { detail: { taskId } }))
    }).then((listener) => {
      if (cancelled) void listener.remove()
      else removeListener = () => { void listener.remove() }
    }).catch((error) => console.error('Could not register notification action listener:', error))
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [])
}

/**
 * Synchronizes OS-scheduled notifications on Capacitor (Android/iOS) and
 * delivers browser notifications while the app is running. Desktop Tauri does
 * not expose closed-app scheduling through its current notification backend.
 */
export function useNotificationScheduler(
  tasks: Task[],
  settings: TaskNestSettings,
  notifications: TaskNotification[],
  setNotifications: Dispatch<SetStateAction<TaskNotification[]>>,
  ready = true,
) {
  const deliveredRef = useRef<Set<string>>(new Set())
  useNativeNotificationActions()

  useEffect(() => {
    deliveredRef.current = new Set(notifications.map((item) => item.id))
  }, [notifications])

  useEffect(() => {
    if (!ready) return
    reconcileNativeNotifications(tasks, settings)
    if (!settings.remindersEnabled) return

    const deliver = (task: Task, kind: TaskNotification['kind'], id: string, scheduledFor: Date) => {
      if (deliveredRef.current.has(id)) return
      deliveredRef.current.add(id)
      const record = makeNotification(task, kind, id, scheduledFor)
      setNotifications((current) => current.some((item) => item.id === id) ? current : [record, ...current].slice(0, 200))

      if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(record.title, { body: record.message, tag: id })
        } catch (error) {
          console.warn('Could not show a system notification:', error)
        }
      }
    }

    const check = () => {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      for (const task of tasks) {
        if (task.status === 'Completed') continue

        if (task.reminderAt) {
          const reminderDate = new Date(task.reminderAt)
          if (Number.isFinite(reminderDate.getTime()) && reminderDate.getTime() <= now.getTime()) {
            deliver(task, 'reminder', `reminder-${task.id}-${task.reminderAt}`, reminderDate)
          }
        }

        if (!task.dueDate) continue
        if (settings.automaticDueDateReminders && task.dueDate === today) {
          const dueAt = dateAtLocalTime(task.dueDate, settings.deadlineReminderTime || '09:00')
          if (dueAt && dueAt.getTime() <= now.getTime()) {
            deliver(task, 'due', `due-${task.id}-${task.dueDate}`, dueAt)
          }
        }

        if (settings.automaticOverdueReminders && task.dueDate < today) {
          const overdueAt = dateAtLocalTime(today, settings.deadlineReminderTime || '09:00')
          if (overdueAt && overdueAt.getTime() <= now.getTime()) {
            deliver(task, 'overdue', `overdue-${task.id}-${today}`, overdueAt)
          }
        }
      }
    }

    const handleWake = () => {
      reconcileNativeNotifications(tasks, settings)
      check()
    }
    check()
    const interval = window.setInterval(check, 15_000)
    window.addEventListener('focus', handleWake)
    document.addEventListener('visibilitychange', handleWake)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleWake)
      document.removeEventListener('visibilitychange', handleWake)
    }
  }, [tasks, settings, setNotifications, ready])
}
