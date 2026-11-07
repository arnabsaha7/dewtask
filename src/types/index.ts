
export type TaskStatus = 'To Do' | 'In Progress' | 'Completed'

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low'

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
  /** Optional one-off reminder timestamp, stored as an ISO timestamp. */
  reminderAt?: string | null
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
