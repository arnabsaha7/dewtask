
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Filter } from 'lucide-react'
import type { Tag } from '../../types'

interface Props {
  tags: Tag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export default function TagFilter({
  tags,
  selectedTagIds,
  onChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const toggleTag = (tagId: string) => {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]

    onChange(next)
  }

  const clearFilters = () => {
    onChange([])
  }

  if (tags.length === 0) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
          selectedTagIds.length > 0
            ? 'border-[var(--tn-primary)]/40 bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]'
            : 'border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:border-[var(--tn-primary)]/40 hover:bg-[var(--tn-surface-hover)]'
        }`}
      >
        <Filter size={15} />
        Tags

        {selectedTagIds.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tn-primary)] px-1 text-[10px] font-semibold text-white">
            {selectedTagIds.length}
          </span>
        )}

        <ChevronDown
          size={14}
          className={`transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--tn-border)] px-4 py-3">
            <span className="text-xs font-semibold text-[var(--tn-text-muted)]">
              Filter by tags
            </span>

            {selectedTagIds.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-[var(--tn-primary)] transition hover:opacity-80"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id)

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--tn-surface-hover)]"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selected
                        ? 'border-[var(--tn-primary)] bg-[var(--tn-primary)] text-white'
                        : 'border-[var(--tn-border)]'
                    }`}
                  >
                    {selected && <Check size={11} />}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--tn-text-muted)]">
                    #{tag.name.replace(/^#+/, '')}
                  </span>

                  {selected && (
                    <Check size={14} className="text-[var(--tn-primary)]" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[var(--tn-border)] px-4 py-2.5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--tn-primary)] px-3 py-2 text-xs font-medium text-white transition hover:bg-[var(--tn-primary-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
