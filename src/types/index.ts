export type TaskStatus = 'To Do' | 'In Progress' | 'Completed'

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurrenceEndType = 'never' | 'onDate' | 'afterCount'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number // e.g., 1 = every day/week/month/year, 2 = every 2 weeks
  daysOfWeek?: number[] // 0 (Sun) - 6 (Sat), used when frequency === 'weekly'
  endType: RecurrenceEndType
  endDate?: string | null // YYYY-MM-DD when endType === 'onDate'
  maxOccurrences?: number | null // total runs when endType === 'afterCount'
  occurrenceCount: number // 1-based counter of completed/spawned cycles
}

export interface Category {
  id: string
  workspaceId: string
  name: string
  parentId: string | null
  description?: string
  icon?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  coverImage?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  workspaceId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  workspaceId: string
  categoryId: string
  tagIds?: string[]
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  /** Optional reminder timestamp, stored as an ISO timestamp. */
  reminderAt?: string | null
  /** Optional recurrence schedule for repeating tasks. */
  recurrence?: RecurrenceRule | null
  /** Links all spawned occurrences belonging to the same recurring series. */
  recurrenceSeriesId?: string | null
  /** Optional calendar time block; stored as ISO timestamps. */
  scheduledStart?: string | null
  scheduledEnd?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  /** Enables a deadline-driven progress timer for this task. */
  autoProgressionEnabled?: boolean
  /** Absolute timestamp when the progression timer began. */
  autoProgressionStartAt?: string | null
  /** Absolute timestamp when the progression timer expires. */
  autoProgressionEndAt?: string | null
  checklist?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}