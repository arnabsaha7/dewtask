import type { RecurrenceRule, Task } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

export function getTodayLocalISO(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

function formatDateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addMonthsClamped(base: Date, monthsToAdd: number): Date {
  const targetMonthIndex = base.getMonth() + monthsToAdd
  const targetYear = base.getFullYear() + Math.floor(targetMonthIndex / 12)
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
  const maxDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
  return new Date(
    targetYear,
    normalizedMonth,
    Math.min(base.getDate(), maxDay),
    12,
    0,
    0,
    0,
  )
}

/**
 * Computes the next YYYY-MM-DD due date from an anchor date and recurrence rule.
 */
export function getNextDueDate(
  currentDueDate: string | null,
  rule: RecurrenceRule,
): string {
  const interval = Math.max(1, Math.floor(rule.interval || 1))
  const anchorStr = currentDueDate || getTodayLocalISO()
  const base = parseDateOnly(anchorStr)

  if (rule.frequency === 'daily') {
    base.setDate(base.getDate() + interval)
    return formatDateOnly(base)
  }

  if (rule.frequency === 'weekly') {
    const selectedDays = [...(rule.daysOfWeek ?? [])].sort((a, b) => a - b)
    if (selectedDays.length === 0) {
      base.setDate(base.getDate() + interval * 7)
      return formatDateOnly(base)
    }

    const currentDay = base.getDay()
    const nextDayInSameWeek = selectedDays.find((d) => d > currentDay)
    if (nextDayInSameWeek !== undefined) {
      base.setDate(base.getDate() + (nextDayInSameWeek - currentDay))
      return formatDateOnly(base)
    }

    // Jump to the first selected weekday `interval` weeks later
    const firstDay = selectedDays[0]
    const daysUntilNextWeekStart = 7 - currentDay
    base.setDate(
      base.getDate() + daysUntilNextWeekStart + (interval - 1) * 7 + firstDay,
    )
    return formatDateOnly(base)
  }

  if (rule.frequency === 'monthly') {
    return formatDateOnly(addMonthsClamped(base, interval))
  }

  // yearly
  return formatDateOnly(addMonthsClamped(base, interval * 12))
}

/**
 * Shifts an ISO datetime (like reminderAt) forward by the exact calendar-day
 * difference between oldDueDate and newDueDate, preserving the user's chosen time-of-day.
 */
export function shiftIsoByDueDelta(
  isoTimestamp: string | null | undefined,
  oldDueDate: string | null,
  newDueDate: string,
): string | null {
  if (!isoTimestamp) return null
  const parsed = new Date(isoTimestamp)
  if (!Number.isFinite(parsed.getTime())) return null

  const oldAnchor = parseDateOnly(oldDueDate || getTodayLocalISO())
  const newAnchor = parseDateOnly(newDueDate)
  const deltaDays = Math.round((newAnchor.getTime() - oldAnchor.getTime()) / DAY_MS)

  const shifted = new Date(parsed)
  shifted.setDate(shifted.getDate() + deltaDays)
  return shifted.toISOString()
}

/**
 * Builds the next Task instance when a recurring task is completed.
 * Returns null if the recurrence series has reached its end date or max count.
 */
export function buildNextRecurringTask(completedTask: Task): Task | null {
  const rule = completedTask.recurrence
  if (!rule) return null

  const nextOccurrenceNumber = (rule.occurrenceCount || 1) + 1

  if (
    rule.endType === 'afterCount' &&
    rule.maxOccurrences &&
    nextOccurrenceNumber > rule.maxOccurrences
  ) {
    return null
  }

  const nextDueDate = getNextDueDate(completedTask.dueDate, rule)

  if (
    rule.endType === 'onDate' &&
    rule.endDate &&
    nextDueDate > rule.endDate
  ) {
    return null
  }

  const nowIso = new Date().toISOString()
  const nextReminderAt = shiftIsoByDueDelta(
    completedTask.reminderAt,
    completedTask.dueDate,
    nextDueDate,
  )
  const nextAutoStart = shiftIsoByDueDelta(
    completedTask.autoProgressionStartAt,
    completedTask.dueDate,
    nextDueDate,
  )
  const nextAutoEnd = shiftIsoByDueDelta(
    completedTask.autoProgressionEndAt,
    completedTask.dueDate,
    nextDueDate,
  )

  return {
    ...completedTask,
    id: crypto.randomUUID(),
    status: 'To Do',
    completedAt: null,
    dueDate: nextDueDate,
    reminderAt: nextReminderAt,
    scheduledStart: nextAutoStart,
    scheduledEnd: nextAutoEnd,
    autoProgressionStartAt: nextAutoStart,
    autoProgressionEndAt: nextAutoEnd,
    checklist: (completedTask.checklist ?? []).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      completed: false,
    })),
    recurrenceSeriesId: completedTask.recurrenceSeriesId ?? completedTask.id,
    recurrence: {
      ...rule,
      occurrenceCount: nextOccurrenceNumber,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatRecurrenceLabel(rule?: RecurrenceRule | null): string {
  if (!rule) return 'Does not repeat'
  const interval = Math.max(1, rule.interval || 1)

  if (interval === 1) {
    if (rule.frequency === 'daily') return 'Daily'
    if (rule.frequency === 'weekly') {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return `Weekly (${rule.daysOfWeek.map((d) => WEEKDAY_SHORT[d]).join(', ')})`
      }
      return 'Weekly'
    }
    if (rule.frequency === 'monthly') return 'Monthly'
    if (rule.frequency === 'yearly') return 'Yearly'
  }

  const unitMap: Record<RecurrenceRule['frequency'], string> = {
    daily: 'days',
    weekly: 'weeks',
    monthly: 'months',
    yearly: 'years',
  }
  const base = `Every ${interval} ${unitMap[rule.frequency]}`
  if (rule.frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    return `${base} (${rule.daysOfWeek.map((d) => WEEKDAY_SHORT[d]).join(', ')})`
  }
  return base
}