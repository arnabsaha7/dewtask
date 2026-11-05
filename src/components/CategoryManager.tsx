
import { useMemo, useState } from 'react'

import {
  Folder,
  FolderPlus,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import type { Category, Workspace } from '../types'
import { buildCategoryTree, type CategoryNode } from '../utils/categories'

interface Props {
  workspace: Workspace
  categories: Category[]
  taskCategoryIds: string[]
  onClose: () => void
  onAdd: (name: string, parentId: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

interface CategoryRowProps {
  node: CategoryNode
  depth: number
  categories: Category[]
  taskCategoryIds: string[]
  onAdd: (name: string, parentId: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

const inputStyles =
  'min-w-0 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] text-[var(--tn-text)] placeholder:text-[var(--tn-text-subtle)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/15'

const iconButtonStyles =
  'rounded-md p-1.5 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]'

function CategoryRow({
  node,
  depth,
  categories,
  taskCategoryIds,
  onAdd,
  onRename,
  onDelete,
}: CategoryRowProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [name, setName] = useState(node.name)
  const [childName, setChildName] = useState('')

  const hasChildren = node.children.length > 0
  const hasTasks = taskCategoryIds.includes(node.id)
  const canDelete = !hasChildren && !hasTasks

  const handleRename = () => {
    const trimmed = name.trim()

    if (!trimmed) return

    onRename(node.id, trimmed)
    setEditing(false)
  }

  const handleAddChild = () => {
    const trimmed = childName.trim()

    if (!trimmed) return

    onAdd(trimmed, node.id)
    setChildName('')
    setAddingChild(false)
    setExpanded(true)
  }

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--tn-surface-hover)]"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--tn-text-subtle)] transition hover:text-[var(--tn-text)]"
          aria-label={expanded ? 'Collapse category' : 'Expand category'}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Category icon */}
        <Folder
          size={16}
          className="shrink-0 text-[var(--tn-primary)]"
        />

        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setName(node.name)
                  setEditing(false)
                }
              }}
              className={`${inputStyles} flex-1 px-2 py-1 text-sm`}
            />

            <button
              type="button"
              onClick={handleRename}
              className="text-emerald-500 transition hover:text-emerald-400"
              aria-label="Save category name"
            >
              <Check size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                setName(node.name)
                setEditing(false)
              }}
              className="text-[var(--tn-text-muted)] transition hover:text-[var(--tn-text)]"
              aria-label="Cancel rename"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Category name */}
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--tn-text)]">
              {node.name}
            </span>

            {/* Child / task count */}
            <span className="text-xs text-[var(--tn-text-subtle)]">
              {categories.filter((c) => c.parentId === node.id).length}
              {hasTasks ? ' · Tasks' : ''}
            </span>

            {/* Category actions */}
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setAddingChild(!addingChild)
                  setExpanded(true)
                }}
                className={iconButtonStyles}
                title="Add subcategory"
                aria-label="Add subcategory"
              >
                <FolderPlus size={15} />
              </button>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className={iconButtonStyles}
                title="Rename category"
                aria-label="Rename category"
              >
                <Pencil size={14} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(node.id)}
                disabled={!canDelete}
                className="rounded-md p-1.5 text-[var(--tn-text-muted)] transition hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-25"
                title={
                  !canDelete
                    ? 'Remove child categories or assigned tasks first'
                    : 'Delete category'
                }
                aria-label="Delete category"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add subcategory */}
      {addingChild && (
        <div
          className="flex items-center gap-2 py-2"
          style={{ paddingLeft: `${depth * 20 + 36}px` }}
        >
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChild()
              if (e.key === 'Escape') setAddingChild(false)
            }}
            placeholder="Subcategory name"
            className={`${inputStyles} flex-1 px-3 py-2 text-sm`}
          />

          <button
            type="button"
            onClick={handleAddChild}
            disabled={!childName.trim()}
            className="rounded-lg bg-[var(--tn-primary)] px-3 py-2 text-xs font-medium text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>

          <button
            type="button"
            onClick={() => setAddingChild(false)}
            className="text-[var(--tn-text-muted)] transition hover:text-[var(--tn-text)]"
            aria-label="Cancel adding subcategory"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Nested categories */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              categories={categories}
              taskCategoryIds={taskCategoryIds}
              onAdd={onAdd}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryManager({
  workspace,
  categories,
  taskCategoryIds,
  onClose,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [newCategoryName, setNewCategoryName] = useState('')

  const categoryTree = useMemo(
    () => buildCategoryTree(categories, workspace.id),
    [categories, workspace.id],
  )

  const workspaceCategoryCount = categories.filter(
    (c) => c.workspaceId === workspace.id,
  ).length

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim()

    if (!trimmed) return

    onAdd(trimmed, null)
    setNewCategoryName('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--tn-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-6 py-5">
          <div>
            <h2
              id="category-manager-title"
              className="text-lg font-semibold text-[var(--tn-text)]"
            >
              Manage categories
            </h2>

            <p className="mt-1 text-sm text-[var(--tn-text-muted)]">
              Organize categories inside {workspace.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
            aria-label="Close category manager"
          >
            <X size={20} />
          </button>
        </div>

        {/* Create root category */}
        <div className="border-b border-[var(--tn-border)] p-6">
          <label className="mb-2 block text-sm font-medium text-[var(--tn-text)]">
            Create a category
          </label>

          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory()
              }}
              placeholder="e.g. Projects, Planning, Research"
              className={`${inputStyles} flex-1 px-4 py-2.5 text-sm`}
            />

            <button
              type="button"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        {/* Category tree */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--tn-text)]">
              Category structure
            </h3>

            <span className="text-xs text-[var(--tn-text-subtle)]">
              {workspaceCategoryCount} categories
            </span>
          </div>

          {categoryTree.length > 0 ? (
            <div className="space-y-1">
              {categoryTree.map((node) => (
                <CategoryRow
                  key={node.id}
                  node={node}
                  depth={0}
                  categories={categories}
                  taskCategoryIds={taskCategoryIds}
                  onAdd={onAdd}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder
                size={32}
                className="mb-3 text-[var(--tn-text-subtle)]"
              />

              <p className="text-sm font-medium text-[var(--tn-text)]">
                No categories yet
              </p>

              <p className="mt-1 text-xs text-[var(--tn-text-muted)]">
                Create your first category above.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--tn-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--tn-border)] px-5 py-2 text-sm text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
