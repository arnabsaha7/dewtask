import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type ProfileViewState = 'local-only' | 'signing-in' | 'connected' | 'sync-error'

interface ConnectedDevice {
  id: string
  name: string
  platform: string
  lastSeen?: string
  current?: boolean
}

interface GoogleAccount {
  name: string
  email: string
  avatarUrl?: string
  lastSynced?: string
}

interface ProfileSyncCardProps {
  state: ProfileViewState
  pendingCount?: number
  connectedAccount?: GoogleAccount
  devices?: ConnectedDevice[]
  errorMessage?: string
  onConnect?: () => void
  onCancelSignIn?: () => void
  onSyncNow?: () => void
  onRetry?: () => void
  onDisconnect?: () => void
}

function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'border-[var(--tn-border)] bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)]',
    success: 'border-[var(--tn-success)]/35 bg-[var(--tn-success-soft)] text-[var(--tn-success)]',
    warning: 'border-[var(--tn-warning)]/35 bg-[var(--tn-warning-soft)] text-[var(--tn-warning)]',
    danger: 'border-[var(--tn-danger)]/35 bg-[var(--tn-danger-soft)] text-[var(--tn-danger)]',
  }
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

function PrimaryButton({ children, onClick, disabled, title }: { children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--tn-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tn-primary)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {children}
    </button>
  )
}

export default function ProfileSyncCard({
  state,
  pendingCount = 0,
  connectedAccount,
  devices = [],
  errorMessage,
  onConnect,
  onCancelSignIn,
  onSyncNow,
  onRetry,
  onDisconnect,
}: ProfileSyncCardProps) {
  const isConnected = state === 'connected'
  const isSigningIn = state === 'signing-in'
  const isError = state === 'sync-error'

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--tn-primary)]/35 bg-[var(--tn-surface)] shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--tn-border)] px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]">
            <Cloud size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--tn-text)]">Cloud sync</h2>
            <p className="mt-1 max-w-xl text-[13px] leading-5 text-[var(--tn-text-muted)]">
              Keep your TaskNest data available across your devices using your Google Drive storage.
            </p>
          </div>
        </div>
        {state === 'local-only' && <Status><CloudOff size={13} /> Not connected</Status>}
        {isSigningIn && <Status tone="warning"><LoaderCircle size={13} className="animate-spin" /> Signing in</Status>}
        {isConnected && <Status tone="success"><CheckCircle2 size={13} /> Connected</Status>}
        {isError && <Status tone="danger"><AlertCircle size={13} /> Sync issue</Status>}
      </div>

      <div className="px-5 py-5 sm:px-6">
        {state === 'local-only' && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Your tasks', 'Tasks, lists and workspaces'],
                ['Your preferences', 'Settings and app preferences'],
                ['Your devices', 'Continue on another device'],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)]/55 p-3.5">
                  <p className="text-sm font-semibold text-[var(--tn-text)]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--tn-text-muted)]">{detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-[var(--tn-border)] pt-5 sm:flex-row sm:items-center">
              <div className="max-w-lg">
                <p className="text-sm font-semibold text-[var(--tn-text)]">Optional cloud backup and sync</p>
                <p className="mt-1 text-[13px] leading-5 text-[var(--tn-text-muted)]">
                  Sign in with Google to store a private app data backup in your Google Drive app data area.
                  TaskNest remains usable without signing in.
                </p>
              </div>
              <div className="group relative shrink-0" title="Google sign-in is coming soon">
                <PrimaryButton disabled onClick={onConnect} title="Coming soon">
                  <GoogleMark /> Continue with Google
                </PrimaryButton>
                <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--tn-text)] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
                  Coming soon
                </span>
              </div>
            </div>
          </>
        )}

        {isSigningIn && (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <LoaderCircle size={22} className="animate-spin text-[var(--tn-primary)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--tn-text)]">Waiting for Google sign-in</p>
                <p className="mt-1 text-[13px] text-[var(--tn-text-muted)]">Complete sign-in in the browser window to continue.</p>
              </div>
            </div>
            <button type="button" onClick={onCancelSignIn} className="min-h-9 rounded-lg border border-[var(--tn-border)] px-3.5 text-sm font-medium text-[var(--tn-text)] hover:bg-[var(--tn-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tn-primary)]">
              Cancel
            </button>
          </div>
        )}

        {isConnected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {connectedAccount?.avatarUrl ? (
                  <img src={connectedAccount.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--tn-primary-soft)] text-sm font-semibold text-[var(--tn-primary)]">
                    {connectedAccount?.name?.slice(0, 1).toUpperCase() || 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--tn-text)]">{connectedAccount?.name || 'Google account'}</p>
                  <p className="truncate text-[13px] text-[var(--tn-text-muted)]">{connectedAccount?.email || 'Google account connected'}</p>
                  <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">Last synced: {connectedAccount?.lastSynced || 'Not yet synced'}</p>
                </div>
              </div>
              <PrimaryButton onClick={onSyncNow} >
                <RefreshCw size={15} /> Sync now
              </PrimaryButton>
            </div>
            <div className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)]/50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--tn-text)]">Sync status</p>
                <Status tone="success"><CheckCircle2 size={13} /> Connected</Status>
              </div>
              <p className="mt-1 text-xs text-[var(--tn-text-muted)]">{pendingCount} changes waiting to sync</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--tn-text)]">Connected devices</h3>
              <ul className="mt-2 divide-y divide-[var(--tn-border)]">
                {devices.map((device) => (
                  <li key={device.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)]">
                      <Cloud size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--tn-text)]">{device.name} {device.current && <span className="text-xs font-normal text-[var(--tn-text-muted)]">(This device)</span>}</p>
                      <p className="text-xs text-[var(--tn-text-muted)]">{device.platform}{device.lastSeen ? ` · Last active ${device.lastSeen}` : ''}</p>
                    </div>
                  </li>
                ))}
                {devices.length === 0 && <li className="py-3 text-sm text-[var(--tn-text-muted)]">No other devices connected yet.</li>}
              </ul>
            </div>
            <div className="flex justify-end border-t border-[var(--tn-border)] pt-4">
              <button type="button" onClick={onDisconnect} className="min-h-9 rounded-lg px-3 text-sm font-medium text-[var(--tn-danger)] hover:bg-[var(--tn-danger-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tn-primary)]">
                Disconnect Google account
              </button>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--tn-danger-soft)] text-[var(--tn-danger)]">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--tn-text)]">TaskNest couldn't finish syncing</p>
                <p className="mt-1 max-w-xl text-[13px] leading-5 text-[var(--tn-text-muted)]">
                  {errorMessage || 'Your local data is safe. Check your internet connection or Google Drive access, then try again.'}
                </p>
              </div>
            </div>
            <PrimaryButton onClick={onRetry} >
              <RefreshCw size={15} /> Try again
            </PrimaryButton>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--tn-border)] bg-[var(--tn-surface-muted)]/40 px-5 py-3 text-xs leading-5 text-[var(--tn-text-muted)] sm:px-6">
        <ShieldCheck size={15} className="shrink-0" />
        <span>TaskNest uses Google Drive app data. Your files are not visible in your regular Drive file list.</span>
      </div>
    </section>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.45l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.06v2.6A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.41 13.86A6.02 6.02 0 0 1 6.1 12c0-.65.11-1.28.31-1.86v-2.6H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.46l3.35-2.6Z"/>
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.96 2.98 14.7 2 12 2a10 10 0 0 0-8.94 5.54l3.35 2.6C7.2 7.77 9.4 6.01 12 6.01Z"/>
    </svg>
  )
}
