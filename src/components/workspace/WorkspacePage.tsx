import { AlertTriangle, Folders, X } from 'lucide-react'

import { useEffect, useState } from 'react'
import WorkspaceEditorModal from './WorkspaceEditorModal'
import type { Category, Task, Workspace } from '../../types'
import WorkspaceCard from './WorkspaceCard'

interface Props {
  workspaces: Workspace[]
  tasks: Task[]
  categories: Category[]
  onSelectWorkspace: (workspace: Workspace) => void
  onUpdateWorkspace: (id: string, updates: Partial<Workspace>) => void
  onDeleteWorkspace: (id: string) => void
}

export default function WorkspacePage({
  workspaces,
  tasks,
  categories,
  onSelectWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
}: Props) {
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null)
  const [cardsPerRow, setCardsPerRow] = useState<2 | 3 | 5 | 7>(() => {
    try {
      const saved = Number(localStorage.getItem('tasknest_workspace_cards_per_row'))
      return saved === 2 || saved === 3 || saved === 5 || saved === 7 ? saved : 3
    } catch {
      return 3
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('tasknest_workspace_cards_per_row', String(cardsPerRow))
    } catch {
      // Keep the selected layout for this session if storage is unavailable.
    }
  }, [cardsPerRow])

  const gridColumns: Record<2 | 3 | 5 | 7, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5',
    7: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7',
  }

  return (
    <div className="min-w-0 flex-1 px-6 py-7 lg:px-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--tn-text-muted)]">
          {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
        </p>

        {workspaces.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--tn-text-subtle)] sm:inline">
              Layout
            </span>
            <div
              role="group"
              aria-label="Choose workspace layout"
              className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-1"
            >
              {[2, 3, 5, 7].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCardsPerRow(count as 2 | 3 | 5 | 7)}
                  aria-label={`${count} columns`}
                  aria-pressed={cardsPerRow === count}
                  title={`${count} columns`}
                  className={`flex h-7 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition ${
                    cardsPerRow === count
                      ? 'bg-[var(--tn-primary-soft)] text-[var(--tn-primary)] shadow-sm'
                      : 'text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {workspaces.length > 0 ? (
        <div className={`grid ${gridColumns[cardsPerRow]} items-stretch gap-3 sm:gap-4`}>
          {workspaces
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((workspace) => {
              const workspaceTasks = tasks.filter(
                (task) => task.workspaceId === workspace.id,
              )

              const completedTasks = workspaceTasks.filter(
                (task) => task.status === 'Completed',
              ).length

              return (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  taskCount={workspaceTasks.length}
                  completedCount={completedTasks}
                  onSelect={() => onSelectWorkspace(workspace)}
                  onEdit={() => setEditingWorkspace(workspace)}
                  onDelete={() => setDeletingWorkspace(workspace)}
                />
              )
            })}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--tn-border)] bg-[var(--tn-surface)] px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]">
            <Folders size={26} />
          </div>

          <h2 className="mt-4 text-base font-semibold text-[var(--tn-text)]">
            No workspaces yet
          </h2>

          <p className="mt-1 max-w-sm text-sm text-[var(--tn-text-muted)]">
            Use the + menu in the header to create your first workspace.
          </p>
        </div>
      )}

      {editingWorkspace && (
        <WorkspaceEditorModal
          workspace={editingWorkspace}
          onClose={() => setEditingWorkspace(null)}
          onSave={(data) => {
            onUpdateWorkspace(editingWorkspace.id, data)
            setEditingWorkspace(null)
          }}
        />
      )}

      {deletingWorkspace && (() => {
        const affectedTasks = tasks.filter(
          (task) => task.workspaceId === deletingWorkspace.id,
        ).length
        const affectedFolders = categories.filter(
          (category) => category.workspaceId === deletingWorkspace.id,
        ).length

        const confirmDelete = () => {
          onDeleteWorkspace(deletingWorkspace.id)
          setDeletingWorkspace(null)
        }

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setDeletingWorkspace(null)
              }
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-workspace-title"
              aria-describedby="delete-workspace-description"
              className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] shadow-2xl"
            >
              <div className="flex items-start gap-3 p-5 sm:p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="delete-workspace-title"
                    className="text-base font-semibold text-[var(--tn-text)]"
                  >
                    Delete workspace?
                  </h2>
                  <p
                    id="delete-workspace-description"
                    className="mt-1 break-words text-sm leading-relaxed text-[var(--tn-text-muted)]"
                  >
                    You are about to permanently delete <span className="font-semibold text-[var(--tn-text)]">"{deletingWorkspace.name}"</span> and everything inside it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingWorkspace(null)}
                  aria-label="Close confirmation"
                  className="rounded-lg p-1.5 text-[var(--tn-text-subtle)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mx-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 sm:mx-6">
                <p className="text-xs font-semibold text-[var(--tn-text)]">
                  The following will also be deleted:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--tn-text-muted)]">
                  <li className="flex items-center justify-between gap-4">
                    <span>Folders and subfolders</span>
                    <span className="font-semibold tabular-nums text-[var(--tn-text)]">{affectedFolders}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span>Tasks</span>
                    <span className="font-semibold tabular-nums text-[var(--tn-text)]">{affectedTasks}</span>
                  </li>
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-red-400">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--tn-border)] p-5 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  onClick={() => setDeletingWorkspace(null)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--tn-border)] px-4 text-sm font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  <Folders size={15} />
                  Delete workspace
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
