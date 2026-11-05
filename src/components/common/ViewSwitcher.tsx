import { List, LayoutGrid } from 'lucide-react'

interface Props {
  viewMode: 'list' | 'board'
  onChange: (view: 'list' | 'board') => void
}

export default function ViewSwitcher({ viewMode, onChange }: Props) {
  const buttonBase =
    'rounded-md border px-2 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tn-surface-muted)]'

  const activeClass =
    'border-[var(--tn-nav-active-border)] bg-[var(--tn-nav-active-bg)] text-[var(--tn-nav-active-text)] shadow-sm'

  const idleClass =
    'border-transparent text-[var(--tn-nav-icon)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]'

  return (
    <div
      role="group"
      aria-label="Task view"
      className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-1"
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        title="List view"
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
        className={`${buttonBase} ${viewMode === 'list' ? activeClass : idleClass}`}
      >
        <List size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onChange('board')}
        title="Board view"
        aria-label="Board view"
        aria-pressed={viewMode === 'board'}
        className={`${buttonBase} ${viewMode === 'board' ? activeClass : idleClass}`}
      >
        <LayoutGrid size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
