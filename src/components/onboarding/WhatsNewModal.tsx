import { useEffect, useState } from 'react'
import { Compass, PartyPopper, Sparkles, X } from 'lucide-react'
import {
  fetchReleaseForVersion,
  getReleaseForVersion,
  type ReleaseEntry,
  type ReleaseHighlight,
} from '../../data/releaseNotes'

interface Props {
  open: boolean
  version: string
  previousVersion?: string | null
  onClose: () => void
  onOpenGuide: () => void
}

const badgeStyles: Record<ReleaseHighlight['badge'], string> = {
  New: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  Improved: 'border-sky-500/30 bg-sky-500/15 text-sky-400',
  Fix: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
}

export default function WhatsNewModal({
  open,
  version,
  previousVersion,
  onClose,
  onOpenGuide,
}: Props) {
  const [release, setRelease] = useState<ReleaseEntry>(() =>
    getReleaseForVersion(version),
  )

  useEffect(() => {
    if (!open) return

    setRelease(getReleaseForVersion(version))
    const controller = new AbortController()

    void fetchReleaseForVersion(version, controller.signal)
      .then((fetched) => setRelease(fetched))
      .catch(() => {
        // Keep local/cached fallback on abort or network failure
      })

    return () => controller.abort()
  }, [open, version])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--tn-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] shadow-2xl"
      >
        {/* Header */}
        <div className="relative border-b border-[var(--tn-border)] bg-gradient-to-br from-[var(--tn-primary)]/15 via-[var(--tn-surface-elevated)] to-emerald-500/10 px-6 py-5 pr-12">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close release notes"
            className="absolute right-4 top-4 rounded-lg p-2 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
          >
            <X size={17} />
          </button>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <PartyPopper size={20} />
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id="whats-new-title"
                className="text-lg font-semibold leading-none text-[var(--tn-text)]"
              >
                What’s new in DewTask
              </h2>
              <span className="inline-flex items-center rounded-full border border-[var(--tn-primary)]/30 bg-[var(--tn-primary)]/15 px-2.5 py-1 text-[11px] font-semibold leading-none text-[var(--tn-primary)]">
                v{release.version}
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-[var(--tn-text-muted)]">
            {previousVersion
              ? `Updated from v${previousVersion} · ${release.date}. `
              : `${release.date} · `}
            {release.headline}
          </p>
        </div>

        {/* Highlights List */}
        <div className="max-h-[55vh] space-y-3 overflow-y-auto px-6 py-5">
          {release.highlights.map((item, idx) => (
            <div
              key={`${item.badge}-${item.title ?? item.description}-${idx}`}
              className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-3.5"
            >
              {item.title ? (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        badgeStyles[item.badge]
                      }`}
                    >
                      {item.badge}
                    </span>
                    <h3 className="text-sm font-semibold text-[var(--tn-text)]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--tn-text-muted)]">
                    {item.description}
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      badgeStyles[item.badge]
                    }`}
                  >
                    {item.badge}
                  </span>
                  <p className="text-sm font-medium leading-5 text-[var(--tn-text)]">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tn-border)] bg-[var(--tn-surface)] px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenGuide()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tn-border)] px-3.5 py-2 text-xs font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
          >
            <Compass size={14} />
            Open User Guide
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--tn-primary)] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--tn-primary-hover)]"
          >
            <Sparkles size={14} />
            Continue to DewTask
          </button>
        </div>
      </div>
    </div>
  )
}