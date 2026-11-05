import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'

import {
  BookOpen,
  Bookmark,
  Box,
  Brain,
  Briefcase,
  CalendarDays,
  Camera,
  Car,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code,
  Coffee,
  Compass,
  Cpu,
  Database,
  Dumbbell,
  Film,
  Flag,
  Folder,
  FolderPlus,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Heart,
  Inbox,
  LayoutDashboard,
  Layers,
  Leaf,
  Lightbulb,
  Mail,
  MoreHorizontal,
  Moon,
  Music,
  Package,
  Palette,
  PenTool,
  Pencil,
  Plane,
  Plus,
  Rocket,
  Settings,
  Shield,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Sun,
  Swords,
  Target,
  Terminal,
  Trash2,
  Trophy,
  User,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import CategoryTree from '../CategoryTree'
import WorkspaceEditorModal from '../workspace/WorkspaceEditorModal'
import type { Category, Workspace } from '../../types'
import type { CategoryNode } from '../../utils/categories'

interface WorkspaceWithTree extends Workspace {
  tree: CategoryNode[]
}

interface WorkspaceFormData {
  name: string
  description: string
  icon: string
  color: string
  coverImage?: string
}

interface Props {
  workspaces: WorkspaceWithTree[]
  selectedCategoryId: string | null
  activeNav: string
  onNavigate: (name: string) => void
  onSelectWorkspace: (workspace: Workspace) => void
  onSelectCategory: (category: Category) => void
  onManageCategories: (workspaceId: string) => void
  onCreateWorkspace: (data: WorkspaceFormData) => void
  onUpdateWorkspace: (id: string, updates: Partial<Workspace>) => void
  onDeleteWorkspace: (id: string) => void
  expanded: string[]
  onToggleExpanded: (name: string) => void
}

type FormState = { mode: 'create' } | { mode: 'edit'; workspace: Workspace } | null

interface MenuState {
  workspaceId: string
  anchor: DOMRect
}

// --------------------------------------------------
// Static data
// --------------------------------------------------

const navigation = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'All Tasks', icon: Inbox },
  { name: 'Today', icon: CalendarDays },
  { name: 'Upcoming', icon: Clock3 },
  { name: 'Workspace', label: 'Workspace Management', icon: Briefcase },
]

// Single source of truth for accent colours (dot + icon tint).
// Full class strings so Tailwind can see them.
const colorOptions = [
  { value: 'violet', dot: 'bg-violet-400', text: 'text-violet-700' },
  { value: 'sky', dot: 'bg-sky-400', text: 'text-sky-700' },
  { value: 'amber', dot: 'bg-amber-400', text: 'text-amber-700' },
  { value: 'emerald', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  { value: 'rose', dot: 'bg-rose-400', text: 'text-rose-700' },
  { value: 'indigo', dot: 'bg-indigo-400', text: 'text-indigo-700' },
]

// Curated icon set. Importing icons by name keeps the bundle small
// (`import * as LucideIcons` pulls in every icon the library ships).
const workspaceIcons: Record<string, LucideIcon> = {
  Folder, Briefcase, Code, Gamepad2, BookOpen, User, Heart, Star, Rocket,
  Lightbulb, Palette, Music, Camera, Film, Dumbbell, ShoppingCart, Plane,
  Car, Coffee, Wallet, GraduationCap, Globe, Mail, Brain, Sparkles, Flag,
  Layers, Box, Zap, Wrench, Hammer, Leaf, Sun, Moon, Bookmark, Trophy,
  Swords, Shield, Gift, Compass, Cpu, Database, Terminal, PenTool, Package,
  Smile, Target,
}
// const iconEntries = Object.entries(workspaceIcons)

// Icon names saved by earlier versions of the app
const legacyIconMap: Record<string, string> = {
  gamepad: 'Gamepad2',
  code: 'Code',
  Code2: 'Code',
  CodeXml: 'Code',
  book: 'BookOpen',
  user: 'User',
}

function resolveIconName(icon: string) {
  return legacyIconMap[icon] ?? icon
}

function getWorkspaceIcon(icon: string): LucideIcon {
  return workspaceIcons[resolveIconName(icon)] ?? Folder
}

function getWorkspaceColor(color: string) {
  return (
    colorOptions.find((option) => option.value === color)?.text ??
    'text-emerald-700'
  )
}

// --------------------------------------------------
// Shared styles (one place to keep the UI consistent)
// --------------------------------------------------

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tn-surface-muted)]'

const navItemBase = `flex h-9 w-full items-center justify-start gap-3 whitespace-nowrap rounded-lg px-3 text-[13px] transition ${focusRing}`
const navItemActive = 'border border-[var(--tn-nav-active-border)] bg-[var(--tn-nav-active-bg)] font-semibold text-[var(--tn-nav-active-text)]'
const navItemIdle =
  'border border-transparent text-[var(--tn-text-muted)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]'

const sectionLabel =
  'text-[11px] font-semibold uppercase tracking-wider text-[var(--tn-text-muted)]'

// --------------------------------------------------
// Hooks
// --------------------------------------------------

function useEscapeKey(handler: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handler])
}

// --------------------------------------------------
// Searchable icon picker
// --------------------------------------------------

// --------------------------------------------------
// Delete confirmation modal
// --------------------------------------------------

function DeleteWorkspaceModal({
  workspace,
  onCancel,
  onConfirm,
}: {
  workspace: Workspace
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  useEscapeKey(onCancel)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--tn-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[460px] rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] px-6 py-6 shadow-2xl sm:px-8"
      >
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/10">
            <Trash2 size={25} strokeWidth={2} />
          </div>
        </div>

        <div className="mt-5 text-center">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--tn-text)]">
            Delete “{workspace.name}”?
          </h2>

          <p className="mx-auto mt-2 max-w-[360px] text-sm leading-6 text-[var(--tn-text-muted)]">
            This will permanently delete the workspace and everything in it.
            This action can’t be undone.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          {/* Safe action gets initial focus */}
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className={`flex h-11 items-center justify-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 text-sm font-semibold text-[var(--tn-text)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] ${focusRing}`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg bg-red-500 px-3 text-sm font-semibold text-[var(--tn-text)] transition hover:bg-red-400 active:scale-[0.98] ${focusRing}`}
          >
            <Trash2 size={15} />
            Delete workspace
          </button>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------
// Workspace options menu
// Rendered in a portal with fixed positioning so the sidebar's
// scroll container can't clip it.
// --------------------------------------------------

const MENU_WIDTH = 88

function WorkspaceMenu({
  anchor,
  onEdit,
  onDelete,
  onClose,
}: {
  anchor: DOMRect
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEscapeKey(onClose)

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Element
      // Let the trigger's own click handler do the toggling
      if (target.closest('[data-menu-trigger]')) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  const itemClass = `flex h-9 w-9 items-center justify-center rounded-md transition ${focusRing}`

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-orientation="horizontal"
      style={{
        top: anchor.bottom + 4,
        left: Math.max(8, anchor.right - MENU_WIDTH),
        width: MENU_WIDTH,
      }}
      className="fixed z-50 flex items-center justify-center gap-1 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-1 shadow-xl"
    >
      <button
        type="button"
        role="menuitem"
        title="Edit workspace"
        aria-label="Edit workspace"
        onClick={onEdit}
        className={`${itemClass} text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]`}
      >
        <Pencil size={16} />
      </button>

      <button
        type="button"
        role="menuitem"
        title="Delete workspace"
        aria-label="Delete workspace"
        onClick={onDelete}
        className={`${itemClass} text-red-400 hover:bg-red-500/10 hover:text-red-300`}
      >
        <Trash2 size={16} />
      </button>
    </div>,
    document.body,
  )
}

// --------------------------------------------------
// Main sidebar
// --------------------------------------------------

export default function Sidebar({
  workspaces,
  selectedCategoryId,
  activeNav,
  onNavigate,
  onSelectWorkspace,
  onSelectCategory,
  onManageCategories,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  expanded,
  onToggleExpanded,
}: Props) {
  const [form, setForm] = useState<FormState>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Workspace | null>(null)

  const closeMenu = useCallback(() => setMenu(null), [])
  const closeForm = useCallback(() => setForm(null), [])
  const cancelDelete = useCallback(() => setPendingDelete(null), [])

  const menuWorkspace = menu
    ? workspaces.find((workspace) => workspace.id === menu.workspaceId)
    : undefined

  const toggleMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    workspaceId: string,
  ) => {
    const anchor = event.currentTarget.getBoundingClientRect()
    setMenu((current) =>
      current?.workspaceId === workspaceId ? null : { workspaceId, anchor },
    )
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    onDeleteWorkspace(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[260px] flex-col border-r border-[var(--tn-border)] bg-[var(--tn-surface-muted)]">
        {/* Brand */}
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--tn-border)] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--tn-primary)] shadow-lg shadow-[var(--tn-primary)]/20">
            <Target size={20} className="text-[var(--tn-text)]" />
          </div>

          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-[var(--tn-text)]">
              TaskNest
            </h1>
            <p className="text-[11px] uppercase tracking-wider text-[var(--tn-text-muted)]">
              Personal workspace
            </p>
          </div>
        </div>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
          {/* Primary navigation */}
          <nav aria-label="Main">
            <ul className="space-y-0.5">
              {navigation.map(({ name, label = name, icon: Icon }) => {
                const isActive = activeNav === name

                return (
                  <li key={name}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        closeMenu()
                        onNavigate(name)
                      }}
                      className={`${navItemBase} ${
                        isActive ? navItemActive : navItemIdle
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.8} className={isActive ? 'text-[var(--tn-nav-active-text)]' : 'text-[var(--tn-nav-icon)]'} />
                      {label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Workspaces */}
          <nav aria-label="Workspaces" className="mt-7">
            <div className="mb-2 flex items-center justify-between px-3">
              <h2 className={sectionLabel}>Workspaces</h2>

              <button
                type="button"
                title="Create workspace"
                aria-label="Create workspace"
                onClick={() => {
                  closeMenu()
                  setForm({ mode: 'create' })
                }}
                className={`rounded-md p-1 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] ${focusRing}`}
              >
                <Plus size={15} />
              </button>
            </div>

            <ul className="space-y-1">
              {workspaces.map((workspace) => {
                const WorkspaceIcon = getWorkspaceIcon(workspace.icon)
                const isExpanded = expanded.includes(workspace.name)
                const isActive = activeNav === workspace.name
                const isMenuOpen = menu?.workspaceId === workspace.id
                const panelId = `workspace-${workspace.id}-categories`

                return (
                  <li key={workspace.id}>
                    <div
                      className={`group flex items-center rounded-lg transition ${
                        isActive
                          ? 'border border-[var(--tn-nav-active-border)] bg-[var(--tn-nav-active-bg)]'
                          : 'border border-transparent hover:bg-[var(--tn-nav-hover-bg)]'
                      }`}
                    >
                      {/* Chevron: expand / collapse only */}
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${workspace.name}`}
                        onClick={() => onToggleExpanded(workspace.name)}
                        className={`flex h-9 w-7 shrink-0 items-center justify-center rounded-l-lg text-[var(--tn-text-muted)] transition hover:text-[var(--tn-text)] ${focusRing}`}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>

                      {/* Label: navigate (and reveal categories) */}
                      <button
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          closeMenu()
                          if (!isExpanded) onToggleExpanded(workspace.name)
                          onSelectWorkspace(workspace)
                        }}
                        className={`flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md text-left text-[13px] ${focusRing} ${
                          isActive
                            ? 'font-semibold text-[var(--tn-nav-active-text)]'
                            : 'text-[var(--tn-text)] hover:text-[var(--tn-nav-hover-text)]'
                        }`}
                      >
                        <WorkspaceIcon
                          size={16}
                          strokeWidth={1.8}
                          className={`shrink-0 ${isActive ? 'text-[var(--tn-nav-active-text)]' : getWorkspaceColor(workspace.color)}`}
                        />
                        <span className="truncate">{workspace.name}</span>
                      </button>

                      {/* Row actions: shown on hover / keyboard focus */}
                      <div
                        className={`flex shrink-0 items-center pr-1 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
                          isMenuOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <button
                          type="button"
                          title="Add category"
                          aria-label={`Add category to ${workspace.name}`}
                          onClick={() => {
                            closeMenu()
                            onManageCategories(workspace.id)
                          }}
                          className={`rounded p-1 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] ${focusRing}`}
                        >
                          <FolderPlus size={15} />
                        </button>

                        <button
                          type="button"
                          data-menu-trigger
                          title="Workspace options"
                          aria-label={`Options for ${workspace.name}`}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          onClick={(event) => toggleMenu(event, workspace.id)}
                          className={`rounded p-1 transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] ${focusRing} ${
                            isMenuOpen
                              ? 'bg-[var(--tn-surface-hover)] text-[var(--tn-text)]'
                              : 'text-[var(--tn-text-muted)]'
                          }`}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Categories */}
                    {isExpanded && (
                      <div id={panelId} className="mt-0.5 pl-3">
                        <CategoryTree
                          nodes={workspace.tree}
                          selectedId={selectedCategoryId}
                          onSelect={onSelectCategory}
                        />

                        {workspace.tree.length === 0 && (
                          <button
                            type="button"
                            onClick={() => onManageCategories(workspace.id)}
                            className={`flex h-8 w-full items-center gap-2 rounded-md px-3 text-left text-xs text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] ${focusRing}`}
                          >
                            <Plus size={13} />
                            Add your first category
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* Empty state */}
            {workspaces.length === 0 && (
              <button
                type="button"
                onClick={() => setForm({ mode: 'create' })}
                className={`mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--tn-border)] px-3 py-3 text-xs text-[var(--tn-text-muted)] transition hover:border-[var(--tn-nav-active-border)] hover:text-[var(--tn-text)] ${focusRing}`}
              >
                <Plus size={14} />
                Create your first workspace
              </button>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--tn-border)] p-3">
          <button
            type="button"
            aria-current={activeNav === 'Settings' ? 'page' : undefined}
            onClick={() => {
              closeMenu()
              onNavigate('Settings')
            }}
            className={`${navItemBase} ${
              activeNav === 'Settings' ? navItemActive : navItemIdle
            }`}
          >
            <Settings size={17} strokeWidth={1.8} className={activeNav === 'Settings' ? 'text-[var(--tn-nav-active-text)]' : 'text-[var(--tn-nav-icon)]'} />
            Settings
          </button>

          {/* TODO: turn into an account menu once there is one to open */}
          <div className="mt-2 flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tn-surface-muted)] text-xs font-semibold text-[var(--tn-text)]">
              A
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--tn-text)]">
                My Workspace
              </p>
              <p className="text-[11px] text-[var(--tn-text-muted)]">Personal account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Workspace options menu */}
      {menu && menuWorkspace && (
        <WorkspaceMenu
          anchor={menu.anchor}
          onClose={closeMenu}
          onEdit={() => {
            setForm({ mode: 'edit', workspace: menuWorkspace })
            closeMenu()
          }}
          onDelete={() => {
            setPendingDelete(menuWorkspace)
            closeMenu()
          }}
        />
      )}

      {/* Shared create / edit modal */}
      {form && (
        <WorkspaceEditorModal
          workspace={form.mode === 'edit' ? form.workspace : undefined}
          onClose={closeForm}
          onSave={(data) => {
            if (form.mode === 'edit') {
              onUpdateWorkspace(form.workspace.id, data)
            } else {
              onCreateWorkspace(data)
            }
            closeForm()
          }}
        />
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <DeleteWorkspaceModal
          workspace={pendingDelete}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}