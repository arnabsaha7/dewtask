import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'

import type { WorkspaceFormData } from './components/workspace/WorkspaceEditorModal'
import { usePersistentValue } from './hooks/usePersistentValue'
import { useAppUpdater } from './hooks/useAppUpdater'
import { useNotificationScheduler, type TaskNotification } from './hooks/useNotificationScheduler'

import { buildCategoryTree } from './utils/categories'
import { signInWithGoogle, signOutFromGoogle } from './services/identity'

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


// Load feature screens and overlays only when the user opens them.
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const CreateTaskModal = lazy(() => import('./components/tasks/CreateTaskModal'))
const TaskDetailsDrawer = lazy(() => import('./components/tasks/TaskDetailsDrawer'))
const CategoryManager = lazy(() => import('./components/CategoryManager'))
const TagManager = lazy(() => import('./components/tags/TagManager'))
const Settings = lazy(() => import('./components/settings/Settings'))
const Profile = lazy(() => import('./components/profile/Profile'))
const WorkspacePage = lazy(() => import('./components/workspace/WorkspacePage'))
const WorkspaceEditorModal = lazy(() => import('./components/workspace/WorkspaceEditorModal'))
const WorkspaceExplorer = lazy(() => import('./components/workspace/WorkspaceExplorer'))
const TaskList = lazy(() => import('./components/tasks/TaskList'))
const KanbanBoard = lazy(() => import('./components/tasks/KanbanBoard'))
const CalendarPage = lazy(() => import('./components/calendar/CalendarPage'))
const NotificationsCenter = lazy(() => import('./components/notifications/NotificationsCenter'))



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
    isHydrated: tasksHydrated,
  } = useTasks()

  // --------------------------------------------------
  // Navigation state
  // --------------------------------------------------

  const updater = useAppUpdater()
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null)
  const updateBannerDismissed = dismissedUpdateVersion === updater.availableVersion

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // --------------------------------------------------
  // View state
  // --------------------------------------------------

  const [viewState, setViewState] = useState(() => ({
    defaultView: settings.defaultView,
    selectedView: settings.defaultView,
  }))
  // A changed default view takes effect unless the user selects a view
  // after that setting was last applied.
  const viewMode = viewState.defaultView === settings.defaultView
    ? viewState.selectedView
    : settings.defaultView
  const setViewMode = (mode: 'list' | 'board') => {
    setViewState({ defaultView: settings.defaultView, selectedView: mode })
  }

  // --------------------------------------------------
  // Modal state
  // --------------------------------------------------

  const [managerWorkspaceId, setManagerWorkspaceId] =
    useState<string | null>(null)

  const [tagManagerWorkspaceId, setTagManagerWorkspaceId] =
    useState<string | null>(null)

  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false)
  const [calendarInitialDate, setCalendarInitialDate] = useState<string | null>(null)
  const [calendarWeekRequest, setCalendarWeekRequest] = useState(0)
  const [calendarScheduledStart, setCalendarScheduledStart] = useState<string | null>(null)
  const [calendarScheduledEnd, setCalendarScheduledEnd] = useState<string | null>(null)

  // --------------------------------------------------
  // Selected task for details drawer
  // --------------------------------------------------

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const pendingNotificationTaskId = useRef<string | null>(null)
  const [notifications, setNotifications, notificationsHydrated] = usePersistentValue<TaskNotification[]>('tasknest_notifications', [])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  useNotificationScheduler(tasks, settings, notifications, setNotifications, tasksHydrated && notificationsHydrated)
  const hasUnreadNotifications = useMemo(() => notifications.some((item) => !item.readAt), [notifications])

  useEffect(() => {
    const handleNotificationTask = (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId
      if (!taskId) return
      const task = tasks.find((item) => item.id === taskId)
      if (task) setSelectedTask(task)
      else pendingNotificationTaskId.current = taskId
    }
    window.addEventListener('tasknest:open-task', handleNotificationTask)
    return () => window.removeEventListener('tasknest:open-task', handleNotificationTask)
  }, [tasks])

  useEffect(() => {
    const pendingId = pendingNotificationTaskId.current
    if (!pendingId) return
    const task = tasks.find((item) => item.id === pendingId)
    if (!task) return
    setSelectedTask(task)
    pendingNotificationTaskId.current = null
  }, [tasks])

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

  const handleNavigateCalendar = () => {
    setSelectedCategoryId(null)
    setSelectedWorkspaceId(null)
    setSelectedTagIds([])
    setActiveNav('Calendar')
    // Remount the calendar so its cursor and selected date reset to today,
    // with the calendar's default Week view active.
    setCalendarWeekRequest((current) => current + 1)
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

    // Deleting a workspace also permanently removes everything it owns.
    // Remove tasks first so task hooks can perform their normal cleanup.
    const workspaceTasks = tasks.filter((task) => task.workspaceId === id)
    workspaceTasks.forEach((task) => deleteTask(task.id))

    // Categories include every level of the workspace folder hierarchy.
    setCategories((current) =>
      current.filter((category) => category.workspaceId !== id),
    )

    // Remove tags belonging to this workspace and clear selected tag filters.
    tags
      .filter((tag) => tag.workspaceId === id)
      .forEach((tag) => handleDeleteTag(tag.id))

    // Close the task details drawer if it was showing a task being deleted.
    const deletedTaskIds = new Set(workspaceTasks.map((task) => task.id))
    setSelectedTask((current) =>
      current && deletedTaskIds.has(current.id) ? null : current,
    )

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
    reminderAt?: string | null
    scheduledStart?: string | null
    scheduledEnd?: string | null
    autoProgressionEnabled: boolean
    autoProgressionStartAt: string | null
    autoProgressionEndAt: string | null
  }) => {
    addTask(input)
  }

  const openCalendarTask = (date: string, scheduledStart?: string | null, scheduledEnd?: string | null) => {
    setCalendarInitialDate(date)
    setCalendarScheduledStart(scheduledStart ?? null)
    setCalendarScheduledEnd(scheduledEnd ?? null)
    setNewTaskOpen(true)
  }

  const closeNewTask = () => {
    setNewTaskOpen(false)
    setCalendarInitialDate(null)
    setCalendarScheduledStart(null)
    setCalendarScheduledEnd(null)
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

  const publishIdentityUpdate = (identity: Awaited<ReturnType<typeof signInWithGoogle>>) => {
    window.dispatchEvent(new CustomEvent('tasknest:identity-updated', {
      detail: {
        displayName: identity.account.displayName,
        isLocal: identity.account.isLocal,
        email: identity.account.email,
      },
    }))
  }

  const handleGoogleSignIn = async () => {
    const identity = await signInWithGoogle()
    publishIdentityUpdate(identity)
  }

  const handleGoogleSignOut = async () => {
    const identity = await signOutFromGoogle()
    publishIdentityUpdate(identity)
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="app-window flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <TitleBar
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        title={activeNav}
        onNewTask={() => setNewTaskOpen(true)}
        onNewWorkspace={() => setNewWorkspaceOpen(true)}
        onNotifications={() => setNotificationsOpen((open) => !open)}
        hasUnread={hasUnreadNotifications}
      />
      <div className="app-shell flex min-h-0 w-full flex-1 overflow-hidden">
      {/* Full-height sidebar occupies the left edge of the application. */}
      <Sidebar
        workspaces={categoryTrees}
        selectedCategoryId={selectedCategoryId}
        activeNav={activeNav}
        onNavigate={handleNavigate}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectCategory={handleSelectCategory}
        onManageCategories={setManagerWorkspaceId}
        onUpdateWorkspace={updateWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        collapsed={sidebarCollapsed}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
      />

      {/* Header and page content begin to the right of the sidebar. */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-[var(--tn-bg)] text-[var(--tn-text)]">
        {updater.updateAvailable && !updateBannerDismissed && (
          <div className="mx-5 mt-4 flex flex-col gap-3 rounded-xl border border-[var(--tn-primary)]/30 bg-[var(--tn-primary)]/8 p-4 sm:mx-7 sm:flex-row sm:items-center sm:justify-between lg:mx-9">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--tn-text)]">A TaskNest update is available</p>
              <p className="mt-1 text-xs text-[var(--tn-text-muted)]">Version {updater.availableVersion} is ready to install.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={updater.installUpdate}
                disabled={updater.status === 'downloading' || updater.status === 'installing'}
                className="rounded-lg bg-[var(--tn-primary)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {updater.status === 'downloading' ? 'Downloading…' : 'Install update'}
              </button>
              <button
                type="button"
                onClick={() => setDismissedUpdateVersion(updater.availableVersion)}
                className="rounded-lg border border-[var(--tn-border)] px-3.5 py-2 text-xs font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-muted)]"
              >
                Later
              </button>
            </div>
          </div>
        )}
        {/* Calendar */}
        <Suspense fallback={<div className="flex min-h-48 items-center justify-center text-sm text-[var(--tn-text-muted)]">Loading…</div>}>
        {activeNav === 'Calendar' ? (
          <CalendarPage
            key={calendarWeekRequest}
            tasks={tasks}
            workspaces={workspaces}
            categories={categories}
            onSelectTask={setSelectedTask}
            onUpdateTask={updateTask}
            onToggleTask={toggleTask}
            onCreateTask={openCalendarTask}
          />
        ) : activeNav === 'Profile' ? (
          <Profile />
        ) : activeNav === 'Settings' ? (
          <Settings
            settings={settings}
            updateSetting={updateSetting}
            resetSettings={resetSettings}
            updater={updater}
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
            onNavigateCalendar={handleNavigateCalendar}
          />
        ) : activeNav === 'Workspace' &&
          !selectedCategoryId &&
          !selectedWorkspaceId ? (
          <WorkspacePage
            workspaces={workspaces}
            tasks={tasks}
            categories={categories}
            onSelectWorkspace={handleSelectWorkspace}
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
            onBackToWorkspaces={() => handleNavigate('Workspace')}
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
        </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
      {notificationsOpen && <NotificationsCenter
        open={notificationsOpen}
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
        onMarkRead={(id) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item))}
        onMarkAllRead={() => setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString() }))}
        onSelectTask={(taskId) => {
          const task = tasks.find((item) => item.id === taskId)
          if (task) setSelectedTask(task)
          setNotificationsOpen(false)
        }}
      />}
      </Suspense>

      <Suspense fallback={null}>
      {/* Create task modal */}
      {newTaskOpen && <CreateTaskModal
        open={newTaskOpen}
        workspaces={workspaces}
        categories={categories}
        initialDate={calendarInitialDate}
        initialScheduledStart={calendarScheduledStart}
        initialScheduledEnd={calendarScheduledEnd}
        onClose={closeNewTask}
        onCreate={handleCreateTask}
      />}

      {/* Global create-workspace modal, opened from the header Create menu. */}
      {newWorkspaceOpen && (
        <WorkspaceEditorModal
          onClose={() => setNewWorkspaceOpen(false)}
          onSave={(data: WorkspaceFormData) => {
            createWorkspace(data)
            setNewWorkspaceOpen(false)
          }}
        />
      )}

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
      </Suspense>
      </div>
    </div>
  )
}

export default App