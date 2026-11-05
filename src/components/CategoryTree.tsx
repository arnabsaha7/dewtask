
import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
} from 'lucide-react'

import type { Category } from '../types'
import type { CategoryNode } from '../utils/categories'

interface Props {
  nodes: CategoryNode[]
  selectedId: string | null
  onSelect: (category: Category) => void
  depth?: number
}

export default function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: Props) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <CategoryTreeItem
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </div>
  )
}

interface CategoryTreeItemProps {
  node: CategoryNode
  selectedId: string | null
  onSelect: (category: Category) => void
  depth: number
}

function CategoryTreeItem({
  node,
  selectedId,
  onSelect,
  depth,
}: CategoryTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 2)

  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
          isSelected
            ? 'border border-[var(--tn-nav-active-border)] bg-[var(--tn-nav-active-bg)] font-medium text-[var(--tn-nav-active-text)]'
            : 'border border-transparent text-[var(--tn-text-muted)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          disabled={!hasChildren}
          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
            hasChildren
              ? 'text-[var(--tn-nav-icon)] hover:text-[var(--tn-nav-hover-text)]'
              : 'cursor-default text-transparent'
          }`}
          aria-label={expanded ? 'Collapse category' : 'Expand category'}
        >
          {hasChildren &&
            (expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            ))}
        </button>

        {/* Category selection */}
        <button
          type="button"
          onClick={() => onSelect(node)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)]"
        >
          {expanded && hasChildren ? (
            <FolderOpen size={16} className="shrink-0 text-[var(--tn-nav-icon)]" />
          ) : (
            <Folder size={16} className="shrink-0 text-[var(--tn-nav-icon)]" />
          )}

          <span className="truncate text-sm">{node.name}</span>
        </button>

        {/* Child count */}
        {hasChildren && (
          <span className="text-[10px] text-[var(--tn-text-subtle)]">
            {node.children.length}
          </span>
        )}
      </div>

      {/* Nested categories */}
      {hasChildren && expanded && (
        <div className="mt-1">
          <CategoryTree
            nodes={node.children}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  )
}
