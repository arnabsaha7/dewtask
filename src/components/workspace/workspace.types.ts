import type { Task, Category, Tag } from '../../types'

export type WorkspaceViewMode = 'list' | 'board'

export type CardAppearance =
  | {
      type: 'solid'
      color: string
    }
  | {
      type: 'image'
      imageUrl: string
    }

export interface WorkspacePageProps {
  tasks: Task[]
  categories: Category[]
  tags: Tag[]

  selectedTagIds: string[]
  onSelectedTagIdsChange: (tagIds: string[]) => void

  activeNav: string
  selectedCategoryId: string | null
  selectedWorkspaceId: string | null

  viewMode: WorkspaceViewMode
  onViewModeChange: (view: WorkspaceViewMode) => void

  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onSelectTask: (task: Task) => void
  onManageTags: () => void
  onCreateTask: () => void
}

export interface WorkspaceCardProps {
  task: Task
  category?: Category
  onSelect: (task: Task) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  appearance?: CardAppearance
}

export interface WorkspaceHeaderProps {
  title: string
  taskCount: number
  completedCount: number
  tags: Tag[]
  selectedTagIds: string[]
  onSelectedTagIdsChange: (tagIds: string[]) => void
  viewMode: WorkspaceViewMode
  onViewModeChange: (view: WorkspaceViewMode) => void
  onManageTags: () => void
  onCreateTask: () => void
  showManageTags: boolean
}