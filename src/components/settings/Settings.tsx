
import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Palette,
  ListTodo,
  Bell,
  Database,
  Info,
  RotateCcw,
} from 'lucide-react'
import type { TaskNestSettings } from '../../hooks/useSettings'
import SettingsSections from './SettingsSections'

type Section = 'general' | 'tasks' | 'notifications' | 'data' | 'about'

const sections: {
  id: Section
  label: string
  description: string
  icon: typeof SettingsIcon
}[] = [
  { id: 'general', label: 'General', description: 'Appearance and regional preferences', icon: Palette },
  { id: 'tasks', label: 'Task preferences', description: 'Choose how tasks are displayed', icon: ListTodo },
  { id: 'notifications', label: 'Notifications', description: 'Reminder preferences', icon: Bell },
  { id: 'data', label: 'Data & storage', description: 'Backup, restore and manage your data', icon: Database },
  { id: 'about', label: 'About', description: 'Application information', icon: Info },
]

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-4 py-2.5 text-sm font-medium text-[var(--tn-text)] transition hover:bg-[var(--tn-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)]/50'

interface SettingsProps {
  settings: TaskNestSettings
  updateSetting: <K extends keyof TaskNestSettings>(
    key: K,
    value: TaskNestSettings[K],
  ) => void
  resetSettings: () => void
}

export default function Settings({
  settings,
  updateSetting,
  resetSettings,
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<Section>('general')
  const [notice, setNotice] = useState('')

  const activeItem = sections.find((section) => section.id === activeSection)

  const update = <K extends keyof TaskNestSettings>(
    key: K,
    value: TaskNestSettings[K],
  ) => updateSetting(key, value)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const reset = () => {
    if (!window.confirm('Reset all TaskNest preferences to their default values?')) return

    resetSettings()
    showNotice('Preferences restored to defaults.')
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-7 sm:px-7 lg:px-10 lg:py-9">
      <header className="mb-8 border-b border-[var(--tn-border)] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--tn-primary)]/25 bg-[var(--tn-primary-soft)] text-[var(--tn-primary)]">
            <SettingsIcon size={21} />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--tn-text)]">
              Settings
            </h1>
            <p className="mt-1 text-sm text-[var(--tn-text-muted)]">
              Manage your TaskNest preferences and workspace data.
            </p>
          </div>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--tn-text)]"
        >
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-10">
        <aside className="h-fit lg:sticky lg:top-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tn-text-muted)]">
            Preferences
          </p>

          <nav
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-2 lg:flex-col"
          >
            {sections.map((section) => {
              const Icon = section.icon
              const selected = activeSection === section.id

              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => setActiveSection(section.id)}
                  className={[
                    'flex min-w-fit items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tn-surface)]',
                    'lg:w-full',
                    selected
                      ? 'border-[var(--tn-nav-active-border)] bg-[var(--tn-nav-active-bg)] font-semibold text-[var(--tn-nav-active-text)]'
                      : 'border-transparent font-medium text-[var(--tn-text-muted)] hover:bg-[var(--tn-nav-hover-bg)] hover:text-[var(--tn-nav-hover-text)]',
                  ].join(' ')}
                >
                  <Icon
                    size={17}
                    aria-hidden="true"
                    className={
                      selected
                        ? 'shrink-0 text-[var(--tn-nav-active-text)]'
                        : 'shrink-0 text-[var(--tn-nav-icon)]'
                    }
                  />
                  <span className="text-sm">{section.label}</span>
                </button>
              )
            })}
          </nav>

          <p className="mt-3 hidden px-3 text-xs leading-5 text-[var(--tn-text-muted)] lg:block">
            Preferences are saved automatically on this device.
          </p>
        </aside>

        <main className="min-w-0">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--tn-text)]">
              {activeItem?.label}
            </h2>
            <p className="mt-1 text-sm text-[var(--tn-text-muted)]">
              {activeItem?.description}
            </p>
          </div>

          <SettingsSections
            section={activeSection}
            settings={settings}
            updateSetting={update}
            onNotice={showNotice}
          />

          {activeSection !== 'data' && (
            <div className="mt-6 flex flex-col gap-3 border-t border-[var(--tn-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--tn-text-muted)]">
                Changes are saved automatically.
              </p>

              <button
                type="button"
                className={buttonClass}
                onClick={reset}
              >
                <RotateCcw size={15} />
                Reset preferences
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
