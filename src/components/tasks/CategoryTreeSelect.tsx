import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'
import type { Category } from '../../types'

interface CategoryOption {
  category: Category
  depth: number
}

interface Props {
  options: CategoryOption[]
  categories: Category[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}

const INDENT = 16 // px per depth level
const BASE_PADDING = 8 // px left padding at depth 0

export default function CategoryTreeSelect({
  options,
  categories,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // id -> category, and the set of ids that have at least one child
  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )
  const parentIds = useMemo(() => {
    const ids = new Set<string>()
    categories.forEach((c) => c.parentId && ids.add(c.parentId))
    return ids
  }, [categories])

  // Expanded folders. Starts fully expanded; lives as long as the component
  // is mounted, so closing/reopening the dropdown remembers the state.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(parentIds),
  )

  const selected = options.find((item) => item.category.id === value)

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expand(id: string) {
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  function collapse(id: string) {
    setExpanded((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // When the dropdown opens, make sure the selected item is visible.
  useEffect(() => {
    if (!open || !value) return
    setExpanded((prev) => {
      const next = new Set(prev)
      let current = byId.get(value)
      while (current?.parentId) {
        next.add(current.parentId)
        current = byId.get(current.parentId)
      }
      return next.size === prev.size ? prev : next
    })
  }, [open, value, byId])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // A row is visible only if every ancestor is expanded.
  function isVisible(category: Category) {
    let current = category
    while (current.parentId) {
      if (!expanded.has(current.parentId)) return false
      const parent = byId.get(current.parentId)
      if (!parent) break
      current = parent
    }
    return true
  }

  const visibleOptions = options.filter(({ category }) => isVisible(category))

  function focusRow(el: Element | null | undefined) {
    if (el instanceof HTMLElement) el.focus()
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    category: Category,
    isFolder: boolean,
    isExpanded: boolean,
  ) {
    const rows = Array.from(
      containerRef.current?.querySelectorAll('[role="treeitem"]') ?? [],
    )
    const index = rows.indexOf(event.currentTarget)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(rows[index + 1])
        break
      case 'ArrowUp':
        event.preventDefault()
        focusRow(rows[index - 1])
        break
      case 'ArrowRight':
        event.preventDefault()
        if (isFolder && !isExpanded) expand(category.id)
        else if (isFolder) focusRow(rows[index + 1])
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (isFolder && isExpanded) {
          collapse(category.id)
        } else if (category.parentId) {
          focusRow(
            containerRef.current?.querySelector(
              `[data-id="${CSS.escape(category.parentId)}"]`,
            ),
          )
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onChange(category.id)
        setOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="tree"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-3 text-left text-xs text-[var(--tn-text)] outline-none transition hover:border-[var(--tn-nav-active-border)] focus-visible:border-[var(--tn-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected ? (
            <>
              <Folder size={15} className="shrink-0 text-[var(--tn-nav-icon)]" />
              <span className="truncate">{selected.category.name}</span>
            </>
          ) : (
            <span className="text-[var(--tn-text-subtle)]">Select a category</span>
          )}
        </span>

        <ChevronDown
          size={15}
          className={`shrink-0 text-[var(--tn-text-muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && !disabled && (
        <div
          role="tree"
          aria-label="Select category"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] py-1 text-[var(--tn-text)] shadow-2xl"
        >
          {visibleOptions.map(({ category, depth }) => {
            const isSelected = category.id === value
            const isFolder = parentIds.has(category.id)
            const isExpanded = isFolder && expanded.has(category.id)

            return (
              <div
                key={category.id}
                role="treeitem"
                tabIndex={0}
                data-id={category.id}
                aria-level={depth + 1}
                aria-selected={isSelected}
                aria-expanded={isFolder ? isExpanded : undefined}
                style={{ paddingLeft: BASE_PADDING + depth * INDENT }}
                onClick={() => {
                  onChange(category.id)
                  setOpen(false)
                }}
                onDoubleClick={() => isFolder && toggle(category.id)}
                onKeyDown={(event) =>
                  handleRowKeyDown(event, category, isFolder, isExpanded)
                }
                className={`flex h-8 cursor-pointer select-none items-center gap-1.5 border-l-2 pr-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tn-primary)] ${
                  isSelected
                    ? 'border-[var(--tn-nav-active-border)] bg-[var(--tn-nav-active-bg)] font-medium text-[var(--tn-nav-active-text)]'
                    : 'border-transparent text-[var(--tn-text-muted)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]'
                }`}
              >
                {/* Chevron slot: always rendered so labels stay aligned */}
                <span
                  className="flex h-5 w-4 shrink-0 items-center justify-center rounded text-[var(--tn-nav-icon)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]"
                  onClick={(event) => {
                    if (!isFolder) return
                    event.stopPropagation()
                    toggle(category.id)
                  }}
                >
                  {isFolder && (
                    <ChevronRight
                      size={14}
                      className={`transition-transform duration-150 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                </span>

                {isExpanded ? (
                  <FolderOpen
                    size={15}
                    className={`shrink-0 ${
                      isSelected ? 'text-[var(--tn-nav-active-text)]' : 'text-[var(--tn-nav-icon)]'
                    }`}
                  />
                ) : (
                  <Folder
                    size={15}
                    className={`shrink-0 ${
                      isSelected ? 'text-[var(--tn-nav-active-text)]' : 'text-[var(--tn-nav-icon)]'
                    }`}
                  />
                )}

                <span className="min-w-0 flex-1 truncate">
                  {category.name}
                </span>
              </div>
            )
          })}

          {options.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-[var(--tn-text-muted)]">
              No categories available
            </p>
          )}
        </div>
      )}
    </div>
  )
}