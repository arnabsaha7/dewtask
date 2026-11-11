
import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Palette,
  ListTodo,
  Bell,
  Database,
  Cloud,
  Info,
  RotateCcw,
} from 'lucide-react'
import type { TaskNestSettings } from '../../hooks/useSettings'
import SettingsSections from './SettingsSections'
import type { AppUpdaterControls } from '../../hooks/useAppUpdater'

type Section = 'general' | 'appearance' | 'tasks' | 'notifications' | 'sync' | 'data' | 'about'

const sections: {
  id: Section
  label: string
  description: string
  icon: typeof SettingsIcon
}[] = [
  { id: 'general', label: 'General', description: 'Regional and workspace preferences', icon: SettingsIcon },
  { id: 'appearance', label: 'Appearance', description: 'Choose your theme and visual style', icon: Palette },
  { id: 'tasks', label: 'Task preferences', description: 'Choose how tasks are displayed', icon: ListTodo },
  { id: 'notifications', label: 'Notifications', description: 'Reminder preferences', icon: Bell },
  { id: 'sync', label: 'Sync & account', description: 'Google Drive and connected devices', icon: Cloud },
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
  updater: AppUpdaterControls
}

export default function Settings({
  settings,
  updateSetting,
  resetSettings,
  updater,
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<Section>('general')
  const [, setNotice] = useState('')

  const update = <K extends keyof TaskNestSettings>(
    key: K,
    value: TaskNestSettings[K],
  ) => updateSetting(key, value)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const reset = () => {
    if (!window.confirm('Reset all DewTask preferences to their default values?')) return

    resetSettings()
    showNotice('Preferences restored to defaults.')
  }

  return (
    <div className="w-full px-5 py-6 sm:px-7 lg:px-9 xl:px-10 2xl:px-12 lg:py-8">
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8 2xl:gap-10">
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

        </aside>

        <main className="min-w-0">
          <SettingsSections
            section={activeSection}
            settings={settings}
            updateSetting={update}
            onNotice={showNotice}
            updater={updater}
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
