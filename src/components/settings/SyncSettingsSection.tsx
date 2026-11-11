import { Cloud, HardDrive, Laptop, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const cardClass = 'rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5 shadow-sm sm:p-6'

function InfoRow({ icon: Icon, title, description }: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)]">
        <Icon size={17} />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--tn-text)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--tn-text-muted)]">{description}</p>
      </div>
    </div>
  )
}

export default function SyncSettingsSection() {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--tn-text)]">Cloud synchronization</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--tn-text-muted)]">
            Optional Google sign-in and private Google Drive app data backup. TaskNest remains fully usable without connecting an account.
          </p>
        </div>
        <div className={cardClass}>
          <div className="flex flex-col gap-4 border-b border-[var(--tn-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)]">
                <Cloud size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--tn-text)]">Not connected</p>
                <p className="mt-1 text-xs text-[var(--tn-text-muted)]">Your account is currently local to this device.</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Google sign-in is coming soon."
              className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 text-sm font-semibold text-white opacity-55"
            >
              <span className="font-bold">G</span>
              Continue with Google
              <span className="rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span>
            </button>
          </div>

          <div className="grid gap-1 divide-y divide-[var(--tn-border)] sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
            <InfoRow
              icon={RefreshCw}
              title="Automatic synchronization"
              description="Keep changes consistent across your signed-in TaskNest devices."
            />
            <InfoRow
              icon={Laptop}
              title="Connected devices"
              description="See which devices are connected and when they last synchronized."
            />
            <InfoRow
              icon={HardDrive}
              title="Private Drive storage"
              description="TaskNest data will be stored in Google Drive's private app data area, not your regular Drive file list."
            />
            <InfoRow
              icon={LockKeyhole}
              title="Optional by design"
              description="Signing in is optional. Your local workspace remains available when offline or signed out."
            />
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-3.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--tn-text-muted)]" />
            <p className="text-xs leading-5 text-[var(--tn-text-muted)]">
              Cloud synchronization is not active yet. Your current data continues to be stored locally; no data is uploaded by this screen.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
