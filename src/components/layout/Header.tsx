import { useEffect, useRef, useState } from 'react'
import { Bell, CheckSquare, FolderPlus, Plus, Search } from 'lucide-react'

interface Props {
  title: string
  onNewTask: () => void
  onNewWorkspace: () => void
  onNotifications?: () => void
  hasUnread?: boolean
}

// --------------------------------------------------
// Shared styles
// --------------------------------------------------

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)]/60'

// All three controls share one height so the row reads as a single unit
const controlBase = `relative inline-flex h-9 items-center gap-2 rounded-lg text-[13px] transition ${focusRing}`

const secondaryControl =
  'border-0 bg-transparent text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]'

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/i.test(navigator.userAgent)

const shortcutLabel = isMac ? '⌘K' : 'Ctrl K'

// --------------------------------------------------
// Header
// --------------------------------------------------

export default function Header({
  title,
  onNewTask,
  onNewWorkspace,
  onNotifications,
  hasUnread = false,
}: Props) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const createMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!createMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node)) {
        setCreateMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreateMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [createMenuOpen])

  // The keyboard shortcut focuses the persistent inline search field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="tn-titlebar-header flex h-full min-w-0 flex-1 items-center gap-3 px-4">
      <div className="tn-titlebar-meta" data-tauri-drag-region>
        <h1 className="tn-titlebar-page truncate">{title}</h1>
      </div>

      <div data-no-drag
        className="tn-titlebar-search flex min-w-0 items-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 transition focus-within:border-[var(--tn-primary)]/70 focus-within:ring-2 focus-within:ring-[var(--tn-primary)]/15 sm:px-4">
        <Search size={17} className="mr-3 shrink-0 text-[var(--tn-text-subtle)]" />
        <input
          ref={searchInputRef}
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search tasks and workspaces..."
          aria-label="Search tasks and workspaces"
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--tn-text)] !outline-none !ring-0 !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 placeholder:text-[var(--tn-text-subtle)]" style={{ outline: "none", boxShadow: "none", border: 0 }}
        />
        <kbd className="ml-3 hidden shrink-0 rounded border border-[var(--tn-border)] bg-[var(--tn-bg)] px-2 py-1 font-sans text-[11px] text-[var(--tn-text-muted)] lg:inline">
          {shortcutLabel}
        </kbd>
      </div>

      <div className="tn-titlebar-right" data-tauri-drag-region>
        <div className="flex shrink-0 items-center gap-2">

        <button
          type="button"
          onClick={onNotifications}
          title="Notifications"
          aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
          data-no-drag
          className={`${controlBase} ${secondaryControl} w-9 justify-center`}
        >
          <Bell size={16} />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--tn-primary)] ring-2 ring-[var(--tn-bg)]"
            />
          )}
        </button>

        <div ref={createMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setCreateMenuOpen((open) => !open)}
            title="Create new"
            aria-label="Create new"
            aria-haspopup="menu"
            aria-expanded={createMenuOpen}
            data-no-drag
            className={`${controlBase} h-9 w-9 justify-center bg-[var(--tn-primary)] text-white transition hover:bg-[var(--tn-primary-hover)] active:scale-[0.98]`}
          >
            <Plus size={17} />
          </button>

          {createMenuOpen && (
            <div
              role="menu"
              aria-label="Create new"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[210px] overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-1.5 shadow-2xl"
            >
              <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--tn-text-subtle)]">
                Create new
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCreateMenuOpen(false)
                  onNewTask()
                }}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--tn-surface-hover)] ${focusRing}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)] transition group-hover:border-[var(--tn-nav-active-border)] group-hover:bg-[var(--tn-nav-active-bg)] group-hover:text-[var(--tn-nav-active-text)] group-focus-visible:border-[var(--tn-nav-active-border)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--tn-primary)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[var(--tn-surface)]">
                  <CheckSquare size={17} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-[var(--tn-text)]">New task</span>

              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCreateMenuOpen(false)
                  onNewWorkspace()
                }}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--tn-surface-hover)] ${focusRing}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)] transition group-hover:border-[var(--tn-nav-active-border)] group-hover:bg-[var(--tn-nav-active-bg)] group-hover:text-[var(--tn-nav-active-text)] group-focus-visible:border-[var(--tn-nav-active-border)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--tn-primary)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[var(--tn-surface)]">
                  <FolderPlus size={17} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-[var(--tn-text)]">New workspace</span>

              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}