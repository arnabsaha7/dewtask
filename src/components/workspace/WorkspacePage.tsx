import { useState } from 'react'
import {
  Folder, Plus,
} from 'lucide-react'
import WorkspaceEditorModal from './WorkspaceEditorModal'
import type { WorkspaceFormData } from './WorkspaceEditorModal'
import type { Task, Workspace } from '../../types'
import WorkspaceCard from './WorkspaceCard'

interface Props {
  workspaces: Workspace[]
  tasks: Task[]
  onSelectWorkspace: (workspace: Workspace) => void
  onCreateWorkspace: (data: WorkspaceFormData) => void
  onUpdateWorkspace: (id: string, updates: Partial<Workspace>) => void
  onDeleteWorkspace: (id: string) => void
}

export default function WorkspacePage({ workspaces, tasks, onSelectWorkspace, onCreateWorkspace, onUpdateWorkspace, onDeleteWorkspace }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)

  return (
    <div className="min-w-0 flex-1 px-6 py-7 lg:px-9">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--tn-text-muted)]"><Folder size={15} /><span>Workspace Management</span></div>
          <h1 className="text-2xl font-semibold text-[var(--tn-text)]">Workspaces</h1>
          <p className="mt-1 text-sm text-[var(--tn-text-muted)]">Organise your tasks across separate spaces.</p>
        </div>
        <button type="button" onClick={() => setShowCreateModal(true)} className="flex h-10 items-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--tn-primary-hover)]"><Plus size={17} />New workspace</button>
      </div>

      <div className="mb-5 text-sm text-[var(--tn-text-muted)]">{workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}</div>

      {workspaces.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {workspaces
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((workspace) => {
            const workspaceTasks = tasks.filter((task) => task.workspaceId === workspace.id,)
            const completedTasks = workspaceTasks.filter((task) => task.status === 'Completed',).length

            return (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                taskCount={workspaceTasks.length}
                completedCount={completedTasks}
                onSelect={() => onSelectWorkspace(workspace)}
                onEdit={() => {
                  setEditingWorkspace(workspace)
                }}
                onDelete={() => {
                  const confirmed = window.confirm(`Are you sure you want to delete "${workspace.name}"?`,)

                  if (confirmed) {
                    onDeleteWorkspace(workspace.id)
                  }
                }}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--tn-border)] bg-[var(--tn-surface)] px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]"><Folder size={26} /></div>
          <h2 className="mt-4 text-base font-semibold text-[var(--tn-text)]">No workspaces yet</h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--tn-text-muted)]">Create your first workspace to organise your tasks.</p>
          <button type="button" onClick={() => setShowCreateModal(true)} className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--tn-primary-hover)]"><Plus size={16} />Create workspace</button>
        </div>
      )}

      {showCreateModal && <WorkspaceEditorModal onClose={() => setShowCreateModal(false)} onSave={(data) => { onCreateWorkspace(data); setShowCreateModal(false) }} />}
      {editingWorkspace && <WorkspaceEditorModal workspace={editingWorkspace} onClose={() => setEditingWorkspace(null)} onSave={(data) => { onUpdateWorkspace(editingWorkspace.id, data); setEditingWorkspace(null) }} />}
    </div>
  )
}
