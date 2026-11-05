import { useEffect, useState } from 'react'
import { Bell, Plus, Search } from 'lucide-react'

interface Props {
  title: string
  onSearch: () => void
  onNewTask: () => void
  onNotifications?: () => void
  hasUnread?: boolean
}

// --------------------------------------------------
// Shared styles
// --------------------------------------------------

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60'

// All three controls share one height so the row reads as a single unit
const controlBase = `relative inline-flex h-9 items-center gap-2 rounded-lg text-[13px] transition ${focusRing}`

const secondaryControl =
  'border border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-[var(--tn-text)]'

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/i.test(navigator.userAgent)

const shortcutLabel = isMac ? '⌘K' : 'Ctrl K'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

// Today's date, refreshed at local midnight so a long-lived tab never goes stale
function useToday() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    )
    const timer = window.setTimeout(
      () => setToday(new Date()),
      nextMidnight.getTime() - now.getTime() + 1000,
    )
    return () => window.clearTimeout(timer)
  }, [today])

  return today
}

// --------------------------------------------------
// Header
// --------------------------------------------------

export default function Header({
  title,
  onSearch,
  onNewTask,
  onNotifications,
  hasUnread = false,
}: Props) {
  const today = useToday()

  // Make the "⌘K / Ctrl K" hint actually work.
  // Remove this if your app already registers the shortcut elsewhere,
  // otherwise it will fire twice.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSearch])

  return (
    // Height matches the sidebar brand block so the two bottom borders line up
    <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between gap-4 border-b border-[var(--tn-border)] bg-[var(--tn-bg)]/90 px-8 backdrop-blur-xl">
      <div className="min-w-0">
        <time
          dateTime={today.toLocaleDateString('en-CA')}
          className="block text-xs text-[var(--tn-text-muted)]"
        >
          {dateFormatter.format(today)}
        </time>
        <h1 className="mt-0.5 truncate text-lg font-semibold text-[var(--tn-text)]">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Search: looks like a field, collapses to an icon on small screens */}
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search"
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
          className={`${controlBase} ${secondaryControl} w-9 justify-center md:w-60 md:justify-start md:px-3`}
        >
          <Search size={15} className="shrink-0" />
          <span className="hidden md:inline">Search</span>
          <kbd className="ml-auto hidden rounded border border-[var(--tn-border)] bg-white/[0.04] px-1.5 py-0.5 font-sans text-[11px] text-[var(--tn-text-muted)] md:inline">
            {shortcutLabel}
          </kbd>
        </button>

        <button
          type="button"
          onClick={onNotifications}
          title="Notifications"
          aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
          className={`${controlBase} ${secondaryControl} w-9 justify-center`}
        >
          <Bell size={16} />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-400 ring-2 ring-[#0b0f19]"
            />
          )}
        </button>

        <button
          type="button"
          onClick={onNewTask}
          title="New task"
          aria-label="New task"
          className={`${controlBase} w-9 justify-center bg-[var(--tn-primary)] font-medium text-[var(--tn-text)] shadow-lg shadow-indigo-500/20 hover:bg-[var(--tn-primary-hover)] active:scale-[0.98] sm:w-auto sm:px-3.5`}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">New task</span>
        </button>
      </div>
    </header>
  )
}