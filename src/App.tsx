import { useEffect, useState } from 'react'

import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'

import Dashboard from './components/dashboard/Dashboard'

import CreateTaskModal from './components/tasks/CreateTaskModal'
import SearchModal from './components/common/SearchModal'
import TaskDetailsDrawer from './components/tasks/TaskDetailsDrawer'

import CategoryManager from './components/CategoryManager'
import TagManager from './components/tags/TagManager'
import Settings from './components/settings/Settings'

import WorkspacePage from './components/workspace/WorkspacePage'
import WorkspaceExplorer from './components/workspace/WorkspaceExplorer'
import TaskList from './components/tasks/TaskList'
import KanbanBoard from './components/tasks/KanbanBoard'

import { buildCategoryTree } from './utils/categories'

import { useTasks } from './hooks/useTasks'
import { useCategories } from './hooks/useCategories'
import { useWorkspaces } from './hooks/useWorkspaces'
import { useTags } from './hooks/useTags'
import { useSettings } from './hooks/useSettings'

import type {
  Category,
  Task,
  Workspace,
} from './types'

function App() {
  // --------------------------------------------------
  // Persistent application data
  // --------------------------------------------------

  const {
    workspaces,
    setWorkspaces,
  } = useWorkspaces()

  const {
    categories,
    setCategories,
  } = useCategories()

  const {
    tags,
    addTag,
    updateTag,
    deleteTag,
  } = useTags()

  const {
    settings,
    updateSetting,
    resetSettings,
  } = useSettings()

  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  } = useTasks()

  // --------------------------------------------------
  // Navigation state
  // --------------------------------------------------

  const [activeNav, setActiveNav] = useState('Overview')

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string | null>(null)

  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState<string | null>(null)

  // A selected workspace opens in folder-hierarchy mode by default.
  const [workspaceContentMode, setWorkspaceContentMode] =
    useState<'folders' | 'list' | 'board'>('folders')

  // --------------------------------------------------
  // Tag filter state
  // --------------------------------------------------

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // --------------------------------------------------
  // Sidebar state
  // --------------------------------------------------

  const [expanded, setExpanded] = useState<string[]>([
    'Clash of Clans',
    'Engineering',
  ])

  // --------------------------------------------------
  // View state
  // --------------------------------------------------

  const [viewMode, setViewMode] = useState<'list' | 'board'>(
    settings.defaultView,
  )

  // Keep the active view synchronized when the default
  // view changes in Settings.
  useEffect(() => {
    setViewMode(settings.defaultView)
  }, [settings.defaultView])

  // --------------------------------------------------
  // Modal state
  // --------------------------------------------------

  const [managerWorkspaceId, setManagerWorkspaceId] =
    useState<string | null>(null)

  const [tagManagerWorkspaceId, setTagManagerWorkspaceId] =
    useState<string | null>(null)

  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // --------------------------------------------------
  // Selected task for details drawer
  // --------------------------------------------------

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // --------------------------------------------------
  // Tag operations
  // --------------------------------------------------

  const handleDeleteTag = (id: string) => {
    deleteTag(id)

    setSelectedTagIds((current) =>
      current.filter((tagId) => tagId !== id),
    )
  }

  // --------------------------------------------------
  // Task operations
  // --------------------------------------------------

  const handleDeleteTask = (id: string) => {
    deleteTask(id)

    setSelectedTask((current) =>
      current?.id === id ? null : current,
    )
  }

  // --------------------------------------------------
  // Navigation handlers
  // --------------------------------------------------

  const handleNavigate = (name: string) => {
    setActiveNav(name)
    setSelectedCategoryId(null)
    setSelectedWorkspaceId(null)
    setSelectedTagIds([])
  }

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspaceId(workspace.id)
    setSelectedCategoryId(null)
    setActiveNav(workspace.name)
    setSelectedTagIds([])
    setWorkspaceContentMode('folders')
  }

  const handleWorkspaceContentModeChange = (
    mode: 'folders' | 'list' | 'board',
  ) => {
    setWorkspaceContentMode(mode)

    if (mode === 'list' || mode === 'board') {
      setViewMode(mode)
    }
  }

  const handleTaskViewModeChange = (mode: 'list' | 'board') => {
    setViewMode(mode)

    if (selectedWorkspaceId) {
      setWorkspaceContentMode(mode)
    }
  }

  const handleSelectCategory = (category: Category) => {
    setSelectedCategoryId(category.id)
    setSelectedWorkspaceId(null)
    setActiveNav(category.name)
    setSelectedTagIds([])
  }

  // --------------------------------------------------
  // Category trees for sidebar
  // --------------------------------------------------

  const categoryTrees = workspaces.map((workspace) => ({
    ...workspace,
    tree: buildCategoryTree(categories, workspace.id),
  }))

  // --------------------------------------------------
  // Sidebar expand / collapse
  // --------------------------------------------------

  const toggleExpanded = (name: string) => {
    setExpanded((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    )
  }

  // --------------------------------------------------
  // Workspace management
  // --------------------------------------------------

  const createWorkspace = (data: {
    name: string
    description: string
    icon: string
    color: string
    coverImage?: string
  }) => {
    const trimmedName = data.name.trim()

    if (!trimmedName) return

    const duplicate = workspaces.some(
      (workspace) =>
        workspace.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (duplicate) {
      window.alert('A workspace with this name already exists.')
      return
    }

    const now = new Date().toISOString()

    const newWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: data.description,
      icon: data.icon,
      color: data.color,
      coverImage: data.coverImage,
      order: workspaces.length,
      createdAt: now,
      updatedAt: now,
    }

    setWorkspaces((current) => [...current, newWorkspace])

    setExpanded((current) => [...current, newWorkspace.name])
  }

  const updateWorkspace = (
    id: string,
    updates: Partial<Workspace>,
  ) => {
    const currentWorkspace = workspaces.find(
      (workspace) => workspace.id === id,
    )

    if (!currentWorkspace) return

    const updatedName = updates.name?.trim()

    if (updatedName) {
      const duplicate = workspaces.some(
        (workspace) =>
          workspace.id !== id &&
          workspace.name.toLowerCase() === updatedName.toLowerCase(),
      )

      if (duplicate) {
        window.alert('A workspace with this name already exists.')
        return
      }
    }

    const finalUpdates = {
      ...updates,
      ...(updatedName ? { name: updatedName } : {}),
    }

    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === id
          ? {
              ...workspace,
              ...finalUpdates,
              id: workspace.id,
              updatedAt: new Date().toISOString(),
            }
          : workspace,
      ),
    )

    if (updatedName && activeNav === currentWorkspace.name) {
      setActiveNav(updatedName)
    }

    if (updatedName) {
      setExpanded((current) =>
        current.map((name) =>
          name === currentWorkspace.name ? updatedName : name,
        ),
      )
    }
  }

  const deleteWorkspace = (id: string) => {
    const workspace = workspaces.find((item) => item.id === id)

    if (!workspace) return

    const hasCategories = categories.some(
      (category) => category.workspaceId === id,
    )

    const hasTasks = tasks.some(
      (task) => task.workspaceId === id,
    )

    if (hasCategories || hasTasks) {
      window.alert(
        'This workspace cannot be deleted because it still contains categories or tasks. Delete or move them first.',
      )
      return
    }

    // Remove tags belonging to this workspace.
    tags
      .filter((tag) => tag.workspaceId === id)
      .forEach((tag) => handleDeleteTag(tag.id))

    setWorkspaces((current) =>
      current.filter((item) => item.id !== id),
    )

    setExpanded((current) =>
      current.filter((name) => name !== workspace.name),
    )

    if (
      selectedWorkspaceId === id ||
      activeNav === workspace.name
    ) {
      setSelectedWorkspaceId(null)
      setSelectedCategoryId(null)
      setActiveNav('Overview')
      setSelectedTagIds([])
    }

    if (managerWorkspaceId === id) {
      setManagerWorkspaceId(null)
    }

    if (tagManagerWorkspaceId === id) {
      setTagManagerWorkspaceId(null)
    }
  }

  // --------------------------------------------------
  // Category management
  // --------------------------------------------------

  const createCategory = (
    workspaceId: string,
    name: string,
    parentId: string | null,
  ) => {
    const now = new Date().toISOString()

    const newCategory: Category = {
      id: crypto.randomUUID(),
      workspaceId,
      name,
      parentId,
      order: categories.filter(
        (category) =>
          category.workspaceId === workspaceId &&
          category.parentId === parentId,
      ).length,
      createdAt: now,
      updatedAt: now,
    }

    setCategories((current) => [...current, newCategory])
  }

  const renameCategory = (id: string, name: string) => {
    const currentCategory = categories.find(
      (category) => category.id === id,
    )

    setCategories((current) =>
      current.map((category) =>
        category.id === id
          ? {
              ...category,
              name,
              updatedAt: new Date().toISOString(),
            }
          : category,
      ),
    )

    if (currentCategory && selectedCategoryId === id) {
      setActiveNav(name)
    }
  }

  const deleteCategory = (id: string) => {
    const hasChildren = categories.some(
      (category) => category.parentId === id,
    )

    const hasTasks = tasks.some(
      (task) => task.categoryId === id,
    )

    if (hasChildren || hasTasks) return

    setCategories((current) =>
      current.filter((category) => category.id !== id),
    )

    if (selectedCategoryId === id) {
      setSelectedCategoryId(null)
      setActiveNav('Overview')
      setSelectedTagIds([])
    }
  }

  // --------------------------------------------------
  // Task creation
  // --------------------------------------------------

  const handleCreateTask = (input: {
    title: string
    description: string
    workspaceId: string
    categoryId: string
    priority: 'Critical' | 'High' | 'Medium' | 'Low'
    status: 'To Do' | 'In Progress' | 'Completed'
    dueDate: string | null
    autoProgressionEnabled: boolean
    autoProgressionStartAt: string | null
    autoProgressionEndAt: string | null
  }) => {
    addTask(input)
  }

  // --------------------------------------------------
  // Current workspace for category manager
  // --------------------------------------------------

  const managerWorkspace = workspaces.find(
    (workspace) => workspace.id === managerWorkspaceId,
  )

  // --------------------------------------------------
  // Current workspace for tag manager
  // --------------------------------------------------

  const tagManagerWorkspace = workspaces.find(
    (workspace) => workspace.id === tagManagerWorkspaceId,
  )

  // --------------------------------------------------
  // Workspace associated with current navigation
  // --------------------------------------------------

  const currentTagWorkspace =
    workspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    ) ??
    workspaces.find(
      (workspace) =>
        workspace.id ===
        categories.find(
          (category) => category.id === selectedCategoryId,
        )?.workspaceId,
    )

  // --------------------------------------------------
  // Tags available in the current view
  // --------------------------------------------------

  // Global views can filter across tags from all workspaces.
  const availableTags = currentTagWorkspace
    ? tags.filter(
        (tag) => tag.workspaceId === currentTagWorkspace.id,
      )
    : tags

  // --------------------------------------------------
  // Tag manager
  // --------------------------------------------------

  const handleManageTags = () => {
    if (currentTagWorkspace) {
      setTagManagerWorkspaceId(currentTagWorkspace.id)
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="app-shell flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        workspaces={categoryTrees}
        selectedCategoryId={selectedCategoryId}
        activeNav={activeNav}
        onNavigate={handleNavigate}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectCategory={handleSelectCategory}
        onManageCategories={setManagerWorkspaceId}
        onCreateWorkspace={createWorkspace}
        onUpdateWorkspace={updateWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
      />

      {/* Main content */}
      <main className="app-shell ml-[260px] min-h-screen flex-1">
        <Header
          title={activeNav}
          onSearch={() => setSearchOpen(true)}
          onNewTask={() => setNewTaskOpen(true)}
        />

        {/* Settings */}
        {activeNav === 'Settings' ? (
          <Settings
            settings={settings}
            updateSetting={updateSetting}
            resetSettings={resetSettings}
          />
        ) : activeNav === 'Overview' &&
          !selectedCategoryId &&
          !selectedWorkspaceId ? (
          <Dashboard
            tasks={tasks}
            workspaces={workspaces}
            categories={categories}
            onToggleTask={toggleTask}
            onViewAll={() => handleNavigate('All Tasks')}
            onSelectWorkspace={handleSelectWorkspace}
          />
        ) : activeNav === 'Workspace' &&
          !selectedCategoryId &&
          !selectedWorkspaceId ? (
          <WorkspacePage
            workspaces={workspaces}
            tasks={tasks}
            onSelectWorkspace={handleSelectWorkspace}
            onCreateWorkspace={createWorkspace}
            onUpdateWorkspace={updateWorkspace}
            onDeleteWorkspace={deleteWorkspace}
          />
        ) : selectedWorkspaceId && workspaceContentMode === 'folders' ? (
          <WorkspaceExplorer
            workspace={workspaces.find(
              (workspace) => workspace.id === selectedWorkspaceId,
            )!}
            tasks={tasks}
            categories={categories}
            onViewModeChange={handleWorkspaceContentModeChange}
            onCreateTask={() => setNewTaskOpen(true)}
            onManageCategories={() =>
              setManagerWorkspaceId(selectedWorkspaceId)
            }
            onToggleTask={toggleTask}
            onDeleteTask={handleDeleteTask}
            onSelectTask={setSelectedTask}
          />
        ) : selectedWorkspaceId ? (
          <div className="min-w-0 flex-1">
            <div className="flex justify-end px-6 pt-5 lg:px-8">
              <button
                type="button"
                onClick={() => setWorkspaceContentMode('folders')}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--tn-border)] px-3 py-2 text-sm text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
              >
                <span aria-hidden="true">←</span>
                Folders
              </button>
            </div>

            {viewMode === 'list' ? (
              <TaskList
                tasks={tasks}
                categories={categories}
                tags={availableTags}
                settings={settings}
                selectedTagIds={selectedTagIds}
                onSelectedTagIdsChange={setSelectedTagIds}
                activeNav={activeNav}
                selectedCategoryId={selectedCategoryId}
                selectedWorkspaceId={selectedWorkspaceId}
                viewMode={viewMode}
                onViewModeChange={handleTaskViewModeChange}
                onFolderView={() => handleWorkspaceContentModeChange('folders')}
                onToggleTask={toggleTask}
                onDeleteTask={handleDeleteTask}
                onSelectTask={setSelectedTask}
                onManageTags={handleManageTags}
              />
            ) : (
              <KanbanBoard
                tasks={tasks}
                categories={categories}
                tags={availableTags}
                settings={settings}
                selectedTagIds={selectedTagIds}
                onSelectedTagIdsChange={setSelectedTagIds}
                activeNav={activeNav}
                selectedCategoryId={selectedCategoryId}
                selectedWorkspaceId={selectedWorkspaceId}
                viewMode={viewMode}
                onViewModeChange={handleTaskViewModeChange}
                onFolderView={() => handleWorkspaceContentModeChange('folders')}
                onUpdateTask={updateTask}
                onSelectTask={setSelectedTask}
                onManageTags={handleManageTags}
              />
            )}
          </div>
        ) : viewMode === 'list' ? (
          <TaskList
            tasks={tasks}
            categories={categories}
            tags={availableTags}
            settings={settings}
            selectedTagIds={selectedTagIds}
            onSelectedTagIdsChange={setSelectedTagIds}
            activeNav={activeNav}
            selectedCategoryId={selectedCategoryId}
            selectedWorkspaceId={selectedWorkspaceId}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onToggleTask={toggleTask}
            onDeleteTask={handleDeleteTask}
            onSelectTask={setSelectedTask}
            onManageTags={handleManageTags}
          />
        ) : (
          <KanbanBoard
            tasks={tasks}
            categories={categories}
            tags={availableTags}
            settings={settings}
            selectedTagIds={selectedTagIds}
            onSelectedTagIdsChange={setSelectedTagIds}
            activeNav={activeNav}
            selectedCategoryId={selectedCategoryId}
            selectedWorkspaceId={selectedWorkspaceId}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onUpdateTask={updateTask}
            onSelectTask={setSelectedTask}
            onManageTags={handleManageTags}
          />
        )}
      </main>

      {/* Create task modal */}
      <CreateTaskModal
        open={newTaskOpen}
        workspaces={workspaces}
        categories={categories}
        onClose={() => setNewTaskOpen(false)}
        onCreate={handleCreateTask}
      />

      {/* Search modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Category manager */}
      {managerWorkspace && (
        <CategoryManager
          workspace={managerWorkspace}
          categories={categories}
          taskCategoryIds={tasks.map((task) => task.categoryId)}
          onClose={() => setManagerWorkspaceId(null)}
          onAdd={(name, parentId) =>
            createCategory(managerWorkspace.id, name, parentId)
          }
          onRename={renameCategory}
          onDelete={deleteCategory}
        />
      )}

      {/* Tag manager */}
      {tagManagerWorkspace && (
        <TagManager
          workspace={tagManagerWorkspace}
          tags={tags}
          onClose={() => setTagManagerWorkspaceId(null)}
          onAdd={addTag}
          onUpdate={updateTag}
          onDelete={handleDeleteTag}
        />
      )}

      {/* Task details drawer */}
      {selectedTask && (
        <TaskDetailsDrawer
          task={
            tasks.find((task) => task.id === selectedTask.id) ??
            selectedTask
          }
          workspaces={workspaces}
          categories={categories}
          tags={tags}
          onClose={() => setSelectedTask(null)}
          onSave={updateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  )
}

export default App