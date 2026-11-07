import {
  ListTodo,
  Tag as TagIcon,
} from 'lucide-react'

import ViewSwitcher from '../common/ViewSwitcher'
import TagFilter from '../tasks/TagFilter'

import type { WorkspaceHeaderProps } from './workspace.types'

export default function WorkspaceHeader({
  title,
  taskCount,
  completedCount,
  tags,
  selectedTagIds,
  onSelectedTagIdsChange,
  viewMode,
  onViewModeChange,
  onManageTags,
  showManageTags,
}: WorkspaceHeaderProps) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-sm text-[var(--tn-text-muted)]">
          <ListTodo size={15} />
          <span>Workspace</span>
          <span className="opacity-50">/</span>
          <span>{viewMode === 'board' ? 'Board' : 'List'}</span>
        </div>

        <h1 className="truncate text-2xl font-semibold text-[var(--tn-text)]">
          {title}
        </h1>

        <p className="mt-1 text-sm text-[var(--tn-text-muted)]">
          {taskCount} tasks
          <span className="mx-2 opacity-40">·</span>
          {completedCount} completed
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TagFilter
          tags={tags}
          selectedTagIds={selectedTagIds}
          onChange={onSelectedTagIdsChange}
        />

        {showManageTags && (
          <button
            type="button"
            onClick={onManageTags}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--tn-border)] px-3 py-2.5 text-sm text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
          >
            <TagIcon size={15} />
            <span>Manage Tags</span>
          </button>
        )}

        <ViewSwitcher
          viewMode={viewMode}
          onChange={onViewModeChange}
        />
      </div>
    </header>
  )
}