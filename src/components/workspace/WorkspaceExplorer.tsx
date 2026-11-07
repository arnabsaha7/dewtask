import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Folder,
  FolderOpen,
  FolderPlus,
  List,
  LayoutGrid,
  ListTodo,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

import type { Category, Task, Workspace } from '../../types'
import AutoProgressIndicator from '../tasks/AutoProgressIndicator'
import { buildCategoryTree, type CategoryNode } from '../../utils/categories'

interface Props {
  workspace: Workspace
  tasks: Task[]
  categories: Category[]
  onViewModeChange: (mode: 'folders' | 'list' | 'board') => void
  onBackToWorkspaces: () => void
  onManageCategories: () => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onSelectTask: (task: Task) => void
}

interface FolderBranchProps {
  node: CategoryNode
  depth: number
  tasks: Task[]
  allTasks: Task[]
  expandedIds: Set<string>
  search: string
  onToggleExpanded: (id: string) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onSelectTask: (task: Task) => void
}

const priorityClass: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-amber-500/10 text-amber-400',
  Low: 'bg-emerald-500/10 text-emerald-400',
}

function getTaskDate(value: string | null) {
  if (!value) return 'No due date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getDescendantCategoryIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(getDescendantCategoryIds)]
}

function TaskRow({
  task,
  depth = 0,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: {
  task: Task
  depth?: number
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onSelectTask: (task: Task) => void
}) {
  const completed = task.status === 'Completed'

  return (
    <div
      className="group grid min-w-0 grid-cols-[20px_minmax(0,1fr)_76px_24px] items-center gap-x-3 gap-y-2 rounded-xl border border-transparent px-3 py-3 transition hover:border-[var(--tn-border)] hover:bg-[var(--tn-surface-hover)] sm:grid-cols-[20px_minmax(0,1fr)_100px_72px_24px] md:grid-cols-[20px_minmax(0,1fr)_112px_76px_100px_24px] lg:grid-cols-[20px_minmax(0,1fr)_112px_104px_76px_100px_24px]"
      style={{ marginLeft: `${depth * 22}px` }}
    >
      <button
        type="button"
        onClick={() => onToggleTask(task.id)}
        className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border transition ${
          completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-[var(--tn-border)] text-transparent hover:border-[var(--tn-primary)]'
        }`}
        aria-label={completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
        title={completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {completed ? <Check size={12} /> : <Circle size={11} />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onSelectTask(task)}
          className={`block max-w-full truncate text-left text-sm font-medium transition hover:text-[var(--tn-primary)] ${
            completed ? 'text-[var(--tn-text-subtle)] line-through' : 'text-[var(--tn-text)]'
          }`}
        >
          {task.title}
        </button>
        {task.description && (
          <p className="mt-1 truncate text-xs text-[var(--tn-text-subtle)]">{task.description}</p>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-start">
        <AutoProgressIndicator task={task} compact compactWidth="wide" />
      </div>

      <span className={`hidden rounded-md px-2 py-1 text-[10px] font-semibold sm:inline-flex ${priorityClass[task.priority] ?? ''}`}>
        {task.priority}
      </span>

      <span className={`hidden min-w-0 items-center gap-1 text-xs md:flex ${completed ? 'text-emerald-400' : 'text-[var(--tn-text-subtle)]'}`}>
        {task.status === 'In Progress' ? <Clock3 size={12} /> : <Circle size={11} />}
        {task.status}
      </span>

      <span className="hidden min-w-0 items-center justify-end gap-1 text-xs text-[var(--tn-text-subtle)] lg:flex">
        <CalendarDays size={12} />
        {getTaskDate(task.dueDate)}
      </span>

      <button
        type="button"
        onClick={() => onDeleteTask(task.id)}
        className="rounded-lg p-1.5 text-[var(--tn-text-subtle)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Delete ${task.title}`}
        title="Delete task"
      >
        <span className="text-xs">×</span>
      </button>
    </div>
  )
}

function FolderBranch({
  node,
  depth,
  tasks,
  allTasks,
  expandedIds,
  search,
  onToggleExpanded,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: FolderBranchProps) {
  const expanded = expandedIds.has(node.id)
  const childIds = getDescendantCategoryIds(node)
  const nestedTasks = allTasks.filter((task) => childIds.includes(task.categoryId))
  const completed = nestedTasks.filter((task) => task.status === 'Completed').length
  const progress = nestedTasks.length ? Math.round((completed / nestedTasks.length) * 100) : 0
  const directTasks = tasks.filter((task) => task.categoryId === node.id)
  const hasContent = node.children.length > 0 || directTasks.length > 0
  const query = search.trim().toLowerCase()
  const folderMatches = !query || node.name.toLowerCase().includes(query)
  const matchingDirectTasks = directTasks.filter((task) =>
    !query || `${task.title} ${task.description ?? ''}`.toLowerCase().includes(query),
  )
  const visibleChildren = node.children.filter((child) => {
    if (!query) return true
    const ids = getDescendantCategoryIds(child)
    return child.name.toLowerCase().includes(query) ||
      allTasks.some((task) => ids.includes(task.categoryId) && `${task.title} ${task.description ?? ''}`.toLowerCase().includes(query))
  })

  if (query && !folderMatches && matchingDirectTasks.length === 0 && visibleChildren.length === 0) return null

  return (
    <div className="relative">
      <div
        className="group grid min-w-0 grid-cols-[28px_36px_minmax(0,1fr)_112px_auto] items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[var(--tn-border)] hover:bg-[var(--tn-surface-hover)]"
        style={{ marginLeft: `${depth * 22}px` }}
      >
        <button
          type="button"
          onClick={() => onToggleExpanded(node.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--tn-text-subtle)] transition hover:bg-[var(--tn-surface)] hover:text-[var(--tn-text)]"
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]">
          {expanded ? <FolderOpen size={18} /> : <Folder size={18} />}
        </div>

        <button
          type="button"
          onClick={() => onToggleExpanded(node.id)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-sm font-semibold text-[var(--tn-text)]">{node.name}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--tn-text-subtle)]">
            {node.children.length} {node.children.length === 1 ? 'subfolder' : 'subfolders'}
            <span className="mx-1.5">·</span>
            {nestedTasks.length} {nestedTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </button>

        <div className="hidden w-full min-w-0 sm:block">
          <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--tn-text-subtle)]">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--tn-border)]">
            <div className="h-full rounded-full bg-[var(--tn-primary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <span className="min-w-7 rounded-lg bg-[var(--tn-surface-muted)] px-2 py-1 text-center text-xs font-medium tabular-nums text-[var(--tn-text-muted)]">
          {nestedTasks.length}
        </span>
        {!hasContent && <span className="sr-only">Empty folder</span>}
      </div>

      {expanded && (
        <div className="relative ml-[26px] border-l border-[var(--tn-border)] pl-3">
          {matchingDirectTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              depth={depth}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              onSelectTask={onSelectTask}
            />
          ))}
          {visibleChildren.map((child) => (
            <FolderBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              tasks={allTasks.filter((task) => task.categoryId === child.id)}
              allTasks={allTasks}
              expandedIds={expandedIds}
              search={search}
              onToggleExpanded={onToggleExpanded}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              onSelectTask={onSelectTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function WorkspaceExplorer({
  workspace,
  tasks,
  categories,
  onViewModeChange,
  onBackToWorkspaces,
  onManageCategories,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: Props) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set(buildCategoryTree(categories, workspace.id).map((category) => category.id)),
  )
  const [showCompleted, setShowCompleted] = useState(true)

  const categoryTree = useMemo(
    () => buildCategoryTree(categories, workspace.id),
    [categories, workspace.id],
  )
  const workspaceTasks = useMemo(
    () => tasks.filter((task) => task.workspaceId === workspace.id),
    [tasks, workspace.id],
  )
  const completedCount = workspaceTasks.filter((task) => task.status === 'Completed').length
  const progress = workspaceTasks.length ? Math.round((completedCount / workspaceTasks.length) * 100) : 0
  const unassignedTasks = workspaceTasks.filter(
    (task) => !categories.some((category) => category.id === task.categoryId && category.workspaceId === workspace.id),
  ).filter((task) => showCompleted || task.status !== 'Completed')
  const visibleUnassignedTasks = unassignedTasks.filter((task) =>
    !search.trim() || `${task.title} ${task.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const visibleTree = categoryTree.filter((node) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    const ids = getDescendantCategoryIds(node)
    return node.name.toLowerCase().includes(query) || workspaceTasks.some((task) =>
      ids.includes(task.categoryId) && `${task.title} ${task.description ?? ''}`.toLowerCase().includes(query),
    )
  })

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    const ids = new Set<string>()
    const visit = (nodes: CategoryNode[]) => nodes.forEach((node) => {
      ids.add(node.id)
      visit(node.children)
    })
    visit(categoryTree)
    setExpandedIds(ids)
  }

  const collapseAll = () => setExpandedIds(new Set())

  return (
    <div className="min-w-0 flex-1 px-6 py-7 lg:px-9">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={onBackToWorkspaces}
              className="text-[var(--tn-text-subtle)] transition hover:text-[var(--tn-primary)]"
            >
              Workspaces
            </button>
            <ChevronRight size={13} className="text-[var(--tn-text-subtle)]" />
            <span aria-current="page" className="truncate text-[var(--tn-text-muted)]">
              {workspace.name}
            </span>
          </nav>
          <p className="text-sm text-[var(--tn-text-muted)]">
            {workspace.description || 'Your projects, folders and tasks in one place.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onManageCategories} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--tn-border)] px-3.5 text-sm font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]">
            <FolderPlus size={15} /> Manage folders
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--tn-text-muted)]"><span>Total tasks</span><ListTodo size={15} /></div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--tn-text)]">{workspaceTasks.length}</div>
          <div className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">Across this workspace</div>
        </div>
        <div className="rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--tn-text-muted)]"><span>Completed</span><Check size={15} className="text-emerald-400" /></div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--tn-text)]">{completedCount}</div>
          <div className="mt-1 text-[11px] text-[var(--tn-text-subtle)]">{workspaceTasks.length - completedCount} remaining</div>
        </div>
        <div className="rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--tn-text-muted)]"><span>Overall progress</span><Sparkles size={15} className="text-[var(--tn-primary)]" /></div>
          <div className="mt-2 flex items-end justify-between"><span className="text-2xl font-semibold tabular-nums text-[var(--tn-text)]">{progress}%</span><span className="text-[11px] text-[var(--tn-text-subtle)]">{completedCount} of {workspaceTasks.length}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--tn-border)]"><div className="h-full rounded-full bg-[var(--tn-primary)] transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tn-text-subtle)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search folders and tasks..."
            className="h-10 w-full rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] pl-9 pr-3 text-sm text-[var(--tn-text)] outline-none transition placeholder:text-[var(--tn-text-subtle)] focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowCompleted((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${showCompleted ? 'border-[var(--tn-border)] text-[var(--tn-text-muted)]' : 'border-[var(--tn-primary)]/40 bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]'}`}>
            <SlidersHorizontal size={14} /> {showCompleted ? 'Hide completed' : 'Show completed'}
          </button>
          <button type="button" onClick={expandAll} className="h-10 rounded-xl border border-[var(--tn-border)] px-3 text-xs font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)]">Expand all</button>
          <button type="button" onClick={collapseAll} className="h-10 rounded-xl border border-[var(--tn-border)] px-3 text-xs font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)]">Collapse all</button>
          <div className="ml-1 flex h-10 items-center rounded-xl border border-[var(--tn-border)] p-1">
            <button type="button" onClick={() => onViewModeChange('list')} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tn-text-subtle)] transition hover:bg-[var(--tn-surface-hover)]" title="List view" aria-label="List view"><List size={16} /></button>
            <button type="button" onClick={() => onViewModeChange('board')} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tn-text-subtle)] transition hover:bg-[var(--tn-surface-hover)]" title="Board view" aria-label="Board view"><LayoutGrid size={16} /></button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--tn-text)]">Workspace contents</h2>
          </div>
          <span className="rounded-lg bg-[var(--tn-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--tn-text-muted)]">{visibleTree.length} folders</span>
        </div>

        <div className="space-y-1 p-3 sm:p-4">
          {visibleTree.map((node) => (
            <FolderBranch
              key={node.id}
              node={node}
              depth={0}
              tasks={workspaceTasks.filter((task) => task.categoryId === node.id && (showCompleted || task.status !== 'Completed'))}
              allTasks={workspaceTasks.filter((task) => showCompleted || task.status !== 'Completed')}
              expandedIds={expandedIds}
              search={search}
              onToggleExpanded={toggleExpanded}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              onSelectTask={onSelectTask}
            />
          ))}

          {unassignedTasks.length > 0 && (
            <div className="mt-3 border-t border-[var(--tn-border)] pt-3">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--tn-text-muted)]">
                <Folder size={15} className="text-[var(--tn-text-subtle)]" /> Unfiled tasks <span className="text-[var(--tn-text-subtle)]">({unassignedTasks.length})</span>
              </div>
              {visibleUnassignedTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} onSelectTask={onSelectTask} />
              ))}
            </div>
          )}

          {categoryTree.length === 0 && unassignedTasks.length === 0 && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]"><Folder size={25} /></div>
              <h3 className="mt-4 text-sm font-semibold text-[var(--tn-text)]">This workspace is ready for its first folder</h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--tn-text-muted)]">Create folders to organise projects, topics and tasks into a structure that works for you.</p>
              <button type="button" onClick={onManageCategories} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--tn-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--tn-text)] shadow-[0_6px_18px_var(--tn-primary-soft)] transition hover:bg-[var(--tn-primary-hover)] hover:shadow-[0_8px_22px_var(--tn-primary-soft)]"><FolderPlus size={14} /> Create first folder</button>
            </div>
          )}

          {search.trim() && visibleTree.length === 0 && visibleUnassignedTasks.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-[var(--tn-text-muted)]">No folders or tasks match “{search}”.</div>
          )}
        </div>
      </div>
    </div>
  )
}
