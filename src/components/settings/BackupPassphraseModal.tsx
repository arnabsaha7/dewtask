import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Eye, EyeOff, HardDrive, Lock, ShieldAlert, X } from 'lucide-react'

interface BackupPassphraseModalProps {
  open: boolean
  mode: 'export' | 'import'
  encrypted?: boolean
  fileName?: string
  exportedAt?: string
  onClose: () => void
  onSubmit: (passphrase: string) => Promise<void>
}

const MIN_PASSPHRASE_LENGTH = 8

export default function BackupPassphraseModal({
  open,
  mode,
  encrypted = true,
  fileName,
  exportedAt,
  onClose,
  onSubmit,
}: BackupPassphraseModalProps) {
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const requiresPassphrase = mode === 'export' || encrypted

  useEffect(() => {
    if (!open) {
      setPassphrase('')
      setConfirmPassphrase('')
      setShowPassphrase(false)
      setError('')
      setSubmitting(false)
      return
    }
    if (requiresPassphrase) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
      return () => window.clearTimeout(timer)
    }
  }, [open, requiresPassphrase])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, submitting, onClose])

  if (!open) return null

  const formattedDate = exportedAt
    ? new Date(exportedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (mode === 'export') {
      if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
        setError(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters long.`)
        return
      }
      if (passphrase !== confirmPassphrase) {
        setError('Passphrases do not match.')
        return
      }
    } else if (encrypted && !passphrase) {
      setError('Please enter the passphrase for this backup.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(passphrase)
      setPassphrase('')
      setConfirmPassphrase('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process backup.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-passphrase-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tn-primary)]/15 text-[var(--tn-primary)]">
              {requiresPassphrase ? <Lock size={18} /> : <HardDrive size={18} />}
            </div>
            <div>
              <h3
                id="backup-passphrase-title"
                className="text-base font-semibold text-[var(--tn-text)]"
              >
                {mode === 'export'
                  ? 'Encrypt backup'
                  : encrypted
                    ? 'Restore encrypted backup'
                    : 'Restore backup'}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--tn-text-subtle)]">
                {mode === 'export'
                  ? 'Protect your backup with AES-256 encryption.'
                  : formattedDate
                    ? `Created on ${formattedDate}`
                    : fileName ?? 'Review and confirm backup restoration.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-muted)] hover:text-[var(--tn-text)] disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
          {requiresPassphrase && (
            <div>
              <label
                htmlFor="backup-passphrase-input"
                className="mb-1.5 block text-xs font-medium text-[var(--tn-text)]"
              >
                Passphrase
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="backup-passphrase-input"
                  type={showPassphrase ? 'text' : 'password'}
                  autoComplete={mode === 'export' ? 'new-password' : 'current-password'}
                  value={passphrase}
                  disabled={submitting}
                  onChange={(e) => {
                    setPassphrase(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder={
                    mode === 'export'
                      ? `At least ${MIN_PASSPHRASE_LENGTH} characters`
                      : 'Enter backup passphrase'
                  }
                  className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] py-2.5 pl-3.5 pr-10 text-sm text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassphrase((v) => !v)}
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--tn-text-muted)] hover:text-[var(--tn-text)]"
                >
                  {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'export' && (
            <>
              <div>
                <label
                  htmlFor="backup-passphrase-confirm"
                  className="mb-1.5 block text-xs font-medium text-[var(--tn-text)]"
                >
                  Confirm passphrase
                </label>
                <input
                  id="backup-passphrase-confirm"
                  type={showPassphrase ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassphrase}
                  disabled={submitting}
                  onChange={(e) => {
                    setConfirmPassphrase(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Re-enter passphrase"
                  className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/20"
                />
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />
                <p className="text-xs leading-5 text-[var(--tn-text-muted)]">
                  DewTask does not store this passphrase. If you forget it, this backup cannot be decrypted or recovered.
                </p>
              </div>
            </>
          )}

          {mode === 'import' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div className="text-xs leading-5 text-[var(--tn-text-muted)]">
                {fileName && (
                  <p className="mb-1 font-mono text-[11px] text-[var(--tn-text)]">
                    {fileName}
                  </p>
                )}
                <p>
                  Restoring this backup will replace all current DewTask tasks, workspaces, and preferences on this device.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[var(--tn-border)] pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-4 py-2 text-sm font-medium text-[var(--tn-text)] transition hover:bg-[var(--tn-surface-muted)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--tn-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? mode === 'export'
                  ? 'Encrypting…'
                  : 'Restoring…'
                : mode === 'export'
                  ? 'Export encrypted backup'
                  : encrypted
                    ? 'Decrypt & restore'
                    : 'Restore backup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}