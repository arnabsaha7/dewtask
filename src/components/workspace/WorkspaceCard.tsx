
import { useEffect, useRef, useState } from 'react'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'

import type { Workspace } from '../../types'

interface Props {
  workspace: Workspace
  taskCount: number
  completedCount: number
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

const fallbackBackgrounds: Record<string, string> = {
  violet: 'from-violet-950 to-violet-700',
  sky: 'from-sky-950 to-sky-700',
  amber: 'from-amber-950 to-amber-700',
  emerald: 'from-emerald-950 to-emerald-700',
  rose: 'from-rose-950 to-rose-700',
  indigo: 'from-indigo-950 to-indigo-700',
}

export default function WorkspaceCard({
  workspace,
  taskCount,
  completedCount,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <article className="group relative isolate flex h-[184px] min-w-0 flex-col justify-end overflow-hidden rounded-xl bg-[var(--tn-surface-muted)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:h-[196px]">
      {/* Background image or fallback */}
      {workspace.coverImage ? (
        <img
          src={workspace.coverImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
        />
      ) : (
        <div
          className={`absolute inset-0 -z-20 bg-gradient-to-br ${
            fallbackBackgrounds[workspace.color] ??
            fallbackBackgrounds.violet
          }`}
        />
      )}

      {/* Bottom gradient for text legibility */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Subtle overall image tint */}
      {workspace.coverImage && (
        <div className="absolute inset-0 -z-10 bg-black/10" />
      )}

      {/* Three-dot menu */}
      <div ref={menuRef} className="absolute right-3 top-3 z-20">
        <button
          type="button"
          aria-label={`Options for ${workspace.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation()
            setMenuOpen((open) => !open)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md transition hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <MoreHorizontal size={20} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-10 w-36 overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] py-1 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--tn-text)] transition hover:bg-[var(--tn-surface-hover)]"
          >
            <Pencil size={15} />
            Edit
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-500/10"
          >
            <Trash2 size={15} />
            Delete
          </button>
          </div>
        )}
      </div>

      {/* Clickable card content */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${workspace.name} workspace`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      />

      {/* Text content */}
      <div className="pointer-events-none relative z-10 p-3.5 sm:p-4">
        <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">
          {workspace.name}
        </h2>

        {workspace.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/80 sm:text-xs">
            {workspace.description}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-white/85">
          <span className="font-medium text-white">
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
          </span>

          <span className="h-1 w-1 rounded-full bg-white/60" />

          <span>{completedCount} completed</span>
        </div>
      </div>
    </article>
  )
}
