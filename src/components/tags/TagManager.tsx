
import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, Tag as TagIcon, Trash2, X } from 'lucide-react'

import type { Tag, Workspace } from '../../types'

interface Props {
  workspace: Workspace
  tags: Tag[]
  onClose: () => void
  onAdd: (data: {
    name: string
    workspaceId: string
    color: string
  }) => Tag | null
  onUpdate: (
    id: string,
    updates: Partial<Pick<Tag, 'name' | 'color'>>
  ) => boolean
  onDelete: (id: string) => void
}

const DEFAULT_COLOR = '#6366f1'

export default function TagManager({
  workspace,
  tags,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const workspaceTags = useMemo(
    () =>
      tags
        .filter((tag) => tag.workspaceId === workspace.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tags, workspace.id]
  )

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleAdd = () => {
    const name = newName.trim().replace(/^#+/, '')

    if (!name) {
      setError('Enter a tag name.')
      return
    }

    const created = onAdd({
      name,
      workspaceId: workspace.id,
      color: DEFAULT_COLOR,
    })

    if (!created) {
      setError('A tag with this name already exists.')
      return
    }

    setNewName('')
    setError('')
  }

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id)
    setEditingName(tag.name)
    setError('')
    setDeleteId(null)
  }

  const handleUpdate = () => {
    if (!editingId) return

    const name = editingName.trim().replace(/^#+/, '')

    if (!name) {
      setError('Tag name cannot be empty.')
      return
    }

    const updated = onUpdate(editingId, {
      name,
      color: DEFAULT_COLOR,
    })

    if (!updated) {
      setError('A tag with this name already exists.')
      return
    }

    setEditingId(null)
    setError('')
  }

  const handleDelete = (id: string) => {
    onDelete(id)
    setDeleteId(null)
    setEditingId(null)
    setError('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]">
              <TagIcon size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-[var(--tn-text)]">
                Manage Tags
              </h2>
              <p className="text-xs text-[var(--tn-text-muted)]">
                {workspace.name} · {workspaceTags.length} tags
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Create tag */}
        <div className="border-b border-[var(--tn-border)] p-6">
          <label className="mb-2 block text-sm font-medium text-[var(--tn-text-muted)]">
            Create a new tag
          </label>

          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 focus-within:ring-0 focus-within:outline-none">
              <span className="select-none text-sm font-medium text-[var(--tn-primary)]">
                #
              </span>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value.replace(/^#+/, ''))
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
                placeholder="e.g. Important, Bug, Research..."
                maxLength={40}
                className="min-w-0 flex-1 bg-transparent py-2.5 pl-1 text-sm text-[var(--tn-text)] placeholder:text-[var(--tn-text-subtle)] outline-none focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0"
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Tag list */}
        <div className="max-h-[360px] overflow-y-auto p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--tn-text-muted)]">
              Existing tags
            </h3>
            <span className="text-xs text-[var(--tn-text-subtle)]">
              {workspaceTags.length} total
            </span>
          </div>

          {workspaceTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TagIcon size={28} className="mb-3 text-[var(--tn-text-subtle)]" />
              <p className="text-sm text-[var(--tn-text-muted)]">No tags yet</p>
              <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">
                Create your first tag above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {workspaceTags.map((tag) => (
                <div
                  key={tag.id}
                  className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-3"
                >
                  {editingId === tag.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3">
                        <span className="select-none text-sm font-medium text-[var(--tn-primary)]">
                          #
                        </span>
                        <input
                          value={editingName}
                          onChange={(e) => {
                            setEditingName(e.target.value.replace(/^#+/, ''))
                            setError('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          maxLength={40}
                          autoFocus
                          className="min-w-0 flex-1 bg-transparent py-2 pl-1 text-sm text-[var(--tn-text)] placeholder:text-[var(--tn-text-subtle)] outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleUpdate}
                          className="flex items-center gap-1 rounded-lg bg-[var(--tn-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--tn-primary-hover)]"
                        >
                          <Check size={14} />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : deleteId === tag.id ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-[var(--tn-text-muted)]">
                        Delete <strong>#{tag.name.replace(/^#+/, '')}</strong>?
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(tag.id)}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="truncate rounded-md px-2.5 py-1 text-xs font-medium"
                        style={{
                          color: DEFAULT_COLOR,
                          backgroundColor: `${DEFAULT_COLOR}18`,
                        }}
                      >
                        #{tag.name.replace(/^#+/, '')}
                      </span>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(tag)}
                          title="Edit tag"
                          className="rounded-lg p-2 text-[var(--tn-text-subtle)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(tag.id)
                            setError('')
                          }}
                          title="Delete tag"
                          className="rounded-lg p-2 text-[var(--tn-text-subtle)] transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--tn-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--tn-border)] px-4 py-2 text-sm text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
