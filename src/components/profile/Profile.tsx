import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Laptop,
  LoaderCircle,
  Monitor,
  Pencil,
  X,
  CloudOff,
} from 'lucide-react'

import {
  getTaskNestIdentity,
  updateTaskNestDeviceName,
  updateTaskNestDisplayName,
  type TaskNestIdentity,
} from '../../services/identity'
import { readStorage, writeStorage } from '../../utils/storage'
import ProfileSection from './ProfileSection'

interface ProfileProps {
  /** Optional visual state for design previews. */
  previewState?: 'local-only' | 'connected' | 'sync-error'
}

interface ProfilePreferences extends Record<string, unknown> {
  profileDateOfBirth?: string
}

function initials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  return parts.length
    ? parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : 'DT'
}

function dateLabel(value?: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
}

function birthDateLabel(value?: string | null) {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return ''
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) return ''

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function localDateInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function platformLabel(value: string) {
  const labels: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    android: 'Android',
    ios: 'iOS',
    web: 'Web browser',
  }
  return labels[value.toLowerCase()] ?? value
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 border-b border-[var(--tn-border)] py-4 last:border-b-0 ${className}`}>
      <p className="text-xs font-medium text-[var(--tn-text-muted)]">{label}</p>
      <div className="mt-1.5 min-w-0">{children}</div>
    </div>
  )
}

function EditableField({
  value,
  placeholder,
  label,
  onSave,
}: {
  value: string
  placeholder: string
  label: string
  onSave: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    const normalized = draft.trim()
    if (!normalized) {
      setError(`${label} cannot be empty.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(normalized)
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to update ${label.toLowerCase()}.`)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex min-h-9 items-center gap-3">
        <span className={`min-w-0 flex-1 truncate text-sm ${value ? 'font-medium text-[var(--tn-text)]' : 'italic text-[var(--tn-text-subtle)]'}`}>
          {value || placeholder}
        </span>
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true) }}
          aria-label={`Edit ${label}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tn-primary)]"
        >
          <Pencil size={14} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          maxLength={80}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save()
            if (event.key === 'Escape') { setEditing(false); setError('') }
          }}
          aria-label={label}
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--tn-border-strong)] bg-[var(--tn-input)] px-3 text-sm text-[var(--tn-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tn-primary)]"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          aria-label={`Save ${label}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tn-primary)] text-white hover:bg-[var(--tn-primary-hover)] disabled:opacity-60"
        >
          {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError('') }}
          aria-label={`Cancel ${label} edit`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"
        >
          <X size={15} />
        </button>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-[var(--tn-danger)]">{error}</p>}
    </div>
  )
}

function DateOfBirthField({
  value,
  loading,
  onSave,
}: {
  value: string
  loading: boolean
  onSave: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (draft && (!birthDateLabel(draft) || draft > localDateInputValue())) {
      setError('Choose a valid date that is not in the future.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your date of birth.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--tn-text-muted)]">Loading…</p>
  }

  if (!editing) {
    return (
      <div className="flex min-h-9 items-center gap-3">
        <span className={`min-w-0 flex-1 text-sm ${value ? 'font-medium text-[var(--tn-text)]' : 'italic text-[var(--tn-text-subtle)]'}`}>
          {birthDateLabel(value) || 'Add your date of birth'}
        </span>
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true) }}
          aria-label="Edit date of birth"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tn-primary)]"
        >
          <Pencil size={14} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          type="date"
          value={draft}
          max={localDateInputValue()}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Date of birth"
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--tn-border-strong)] bg-[var(--tn-input)] px-3 text-sm text-[var(--tn-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tn-primary)]"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          aria-label="Save date of birth"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tn-primary)] text-white hover:bg-[var(--tn-primary-hover)] disabled:opacity-60"
        >
          {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError('') }}
          aria-label="Cancel date of birth edit"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"
        >
          <X size={15} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {error
          ? <p role="alert" className="text-xs text-[var(--tn-danger)]">{error}</p>
          : <p className="text-xs text-[var(--tn-text-subtle)]">Optional. Only stored in your local profile.</p>}
        {value && (
          <button type="button" onClick={() => setDraft('')} className="text-xs font-medium text-[var(--tn-text-muted)] underline underline-offset-2 hover:text-[var(--tn-text)]">
            Clear date
          </button>
        )}
      </div>
    </div>
  )
}

function DeviceIcon({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase()
  const Icon = normalized === 'windows' || normalized === 'macos' || normalized === 'linux'
    ? Monitor
    : Laptop
  return <Icon size={21} strokeWidth={1.8} />
}

export default function Profile({ previewState }: ProfileProps) {
  const [identity, setIdentity] = useState<TaskNestIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [dateOfBirthLoading, setDateOfBirthLoading] = useState(true)

  useEffect(() => {
    let alive = true

    void getTaskNestIdentity()
      .then((value) => {
        if (alive) {
          setIdentity(value)
          setLoadError('')
        }
      })
      .catch((cause: unknown) => {
        if (alive) setLoadError(cause instanceof Error ? cause.message : 'Unable to load account details.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    void readStorage<ProfilePreferences>('tasknest_settings')
      .then((settings) => {
        if (alive) setDateOfBirth(typeof settings?.profileDateOfBirth === 'string' ? settings.profileDateOfBirth : '')
      })
      .catch((cause: unknown) => {
        if (alive) setLoadError(cause instanceof Error ? cause.message : 'Unable to load profile details.')
      })
      .finally(() => {
        if (alive) setDateOfBirthLoading(false)
      })

    return () => { alive = false }
  }, [])

  const displayName = identity?.account.displayName?.trim() ?? ''
  const currentDeviceCount = identity?.device?.id ? 1 : 0
  const avatarInitials = useMemo(() => initials(displayName), [displayName])
  const connected = previewState
    ? previewState === 'connected'
    : Boolean(identity && !identity.account.isLocal)
  const syncError = previewState === 'sync-error'

  const publishDisplayName = (value: string) => {
    window.dispatchEvent(new CustomEvent('tasknest:identity-updated', {
      detail: { displayName: value },
    }))
  }

  const saveDisplayName = async (value: string) => {
    const updated = await updateTaskNestDisplayName(value)
    setIdentity(updated)
    publishDisplayName(updated.account.displayName ?? value)
  }

  const saveDeviceName = async (value: string) => {
    setIdentity(await updateTaskNestDeviceName(value))
  }

  const saveDateOfBirth = async (value: string) => {
    const current = await readStorage<ProfilePreferences>('tasknest_settings') ?? {}
    const next: ProfilePreferences = { ...current, profileDateOfBirth: value }
    await writeStorage('tasknest_settings', next)
    setDateOfBirth(value)
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[var(--tn-text-muted)]">
        <LoaderCircle size={17} className="animate-spin" /> Loading profile…
      </div>
    )
  }

  if (!identity) {
    return (
      <main className="w-full px-6 py-8 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tn-primary)]">Account</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--tn-text)]">Profile</h1>
        <div role="alert" className="mt-6 rounded-xl border border-[var(--tn-danger)]/40 bg-[var(--tn-surface)] p-5 text-sm text-[var(--tn-text)]">
          {loadError || 'Unable to load your local account.'}
        </div>
      </main>
    )
  }

  return (
    <main className="w-full px-5 py-6 sm:px-7 lg:px-10 2xl:px-14">
      <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 p-5 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-x-5 sm:p-7 2xl:grid-cols-[76px_minmax(0,1fr)_minmax(340px,auto)]">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--tn-border)] bg-[var(--tn-primary-soft)] font-display text-2xl font-semibold text-[var(--tn-primary)] sm:h-[76px] sm:w-[76px]">
            {avatarInitials}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 className="max-w-full break-words text-xl font-semibold tracking-tight text-[var(--tn-text)]">
                {displayName || 'Your profile'}
              </h2>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  syncError
                    ? 'border-[var(--tn-danger)]/45 bg-[var(--tn-danger-soft)] text-[var(--tn-danger)]'
                    : connected
                      ? 'border-[var(--tn-success)]/45 bg-[var(--tn-success-soft)] text-[var(--tn-success)]'
                      : 'border-[var(--tn-danger)]/45 bg-[var(--tn-danger-soft)] text-[var(--tn-danger)]'
                }`}
                role="status"
                aria-label={syncError ? 'Synchronization error' : connected ? 'Synced' : 'Not synced'}
              >
                {connected && !syncError
                  ? <CheckCircle2 size={13} aria-hidden="true" />
                  : <CloudOff size={13} aria-hidden="true" />}
                {syncError ? 'Sync needs attention' : connected ? 'Synced' : 'Not synced'}
              </span>
            </div>
            <p className="mt-1.5 break-words text-sm text-[var(--tn-text-muted)]">
              {identity.account.email || 'No email address connected'}
            </p>
          </div>

          <div className="col-span-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:col-span-1 2xl:col-start-3 2xl:row-start-1">
            <div className="min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3.5">
              <div className="flex items-center gap-2 text-[var(--tn-text-muted)]">
                <CalendarDays size={14} />
                <p className="text-xs font-medium">Member since</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--tn-text)]">
                {dateLabel(identity.account.createdAt)}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-4 py-3.5">
              <div className="flex items-center gap-2 text-[var(--tn-text-muted)]">
                <Laptop size={14} />
                <p className="text-xs font-medium">Devices</p>
              </div>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-1 text-sm font-semibold text-[var(--tn-text)]">
                <span className="tabular-nums">{currentDeviceCount}</span>
                <span>{currentDeviceCount === 1 ? 'current device' : 'current devices'}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <ProfileSection
          title="Personal information"
          description="Your profile details. Your date of birth is optional and remains on this device."
          bodyClassName="pb-1"
        >
          <div className="grid gap-x-10 md:grid-cols-2">
            <Field label="Display name">
              <EditableField value={displayName} placeholder="Add your name" label="Display name" onSave={saveDisplayName} />
            </Field>
            <Field label="Date of birth">
              <DateOfBirthField value={dateOfBirth} loading={dateOfBirthLoading} onSave={saveDateOfBirth} />
            </Field>
            <Field label="Email address" className="border-b-0">
              <p className={`text-sm ${identity.account.email ? 'font-medium text-[var(--tn-text)]' : 'italic text-[var(--tn-text-subtle)]'}`}>
                {identity.account.email || 'Available after Google sign-in'}
              </p>
            </Field>
            <Field label="Account created" className="border-b-0">
              <p className="text-sm font-medium text-[var(--tn-text)]">{dateLabel(identity.account.createdAt)}</p>
            </Field>
          </div>
        </ProfileSection>

        <ProfileSection
          title="Connected Devices"
          description="Devices registered with this DewTask account."
          bodyClassName="py-1"
        >
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)]">
              <DeviceIcon platform={identity.device.platform} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--tn-text)]">{identity.device.deviceName || 'This device'}</p>
                <span className="rounded-full border border-[var(--tn-primary)]/30 bg-[var(--tn-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--tn-primary)]">
                  Current device
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--tn-text-muted)]">
                {platformLabel(identity.device.platform)} · Added {dateLabel(identity.device.createdAt)}
              </p>
            </div>
            <div className="w-full sm:max-w-[340px]">
              <EditableField
                value={identity.device.deviceName || ''}
                placeholder="Name this device"
                label="Device name"
                onSave={saveDeviceName}
              />
            </div>
          </div>
          {!connected && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3.5 py-3">
              <CloudOff size={15} className="mt-0.5 shrink-0 text-[var(--tn-text-muted)]" />
              <p className="text-xs leading-5 text-[var(--tn-text-muted)]">
                This is the device currently holding your local profile. Sign in from Settings when cloud sync becomes available to connect additional devices.
              </p>
            </div>
          )}
        </ProfileSection>
      </div>

      {loadError && <p role="alert" className="mt-4 text-xs text-[var(--tn-danger)]">{loadError}</p>}
    </main>
  )
}
