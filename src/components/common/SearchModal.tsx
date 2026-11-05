
import { Search, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-[var(--tn-overlay)] px-4 pt-[18vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--tn-border)] px-4">
          <Search size={17} className="text-[var(--tn-text-subtle)]" />

          <input
            autoFocus
            placeholder="Search tasks and workspaces..."
            className="h-14 flex-1 bg-transparent text-sm text-[var(--tn-text)] outline-none placeholder:text-[var(--tn-text-subtle)]"
          />

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--tn-text-subtle)] hover:bg-white/[0.06] hover:text-[var(--tn-text)]"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-4 py-3 text-[11px] text-[var(--tn-text-subtle)]">
          Search will be connected to your task data in a later stage.
        </p>
      </div>
    </div>
  )
}
