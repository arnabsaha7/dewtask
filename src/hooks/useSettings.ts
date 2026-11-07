import { useCallback, useEffect } from 'react'
import { usePersistentValue } from './usePersistentValue'
import { applyTheme } from '../themes/applyTheme'
import { DEFAULT_THEME_ID, themes } from '../themes/registry'

export type Appearance = 'dark' | 'light' | 'system'
export type DefaultView = 'list' | 'board'
export type SortOption = 'created' | 'dueDate' | 'priority' | 'title'
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

export interface TaskNestSettings {
  themeId: string
  appearance: Appearance
  dateFormat: DateFormat
  startOfWeek: 'monday' | 'sunday'
  defaultView: DefaultView
  defaultSort: SortOption
  showCompletedTasks: boolean
  remindersEnabled: boolean
  automaticDueDateReminders: boolean
  automaticOverdueReminders: boolean
  deadlineReminderTime: string
}

export const DEFAULT_SETTINGS: TaskNestSettings = {
  themeId: DEFAULT_THEME_ID,
  appearance: 'light',
  dateFormat: 'DD/MM/YYYY',
  startOfWeek: 'monday',
  defaultView: 'list',
  defaultSort: 'created',
  showCompletedTasks: true,
  remindersEnabled: false,
  automaticDueDateReminders: true,
  automaticOverdueReminders: true,
  deadlineReminderTime: '09:00',
}

export const SETTINGS_STORAGE_KEY = 'tasknest_settings'
export function useSettings() {
  const [storedSettings, setSettings] = usePersistentValue<TaskNestSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
  // Merge defaults so settings saved by older TaskNest versions gain new fields safely.
  const settings: TaskNestSettings = { ...DEFAULT_SETTINGS, ...storedSettings }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyTheme(settings.themeId, mediaQuery.matches)
    apply()
    if (settings.themeId !== 'system') return
    mediaQuery.addEventListener('change', apply)
    return () => mediaQuery.removeEventListener('change', apply)
  }, [settings.themeId])

  const updateSetting = useCallback(<K extends keyof TaskNestSettings>(key: K, value: TaskNestSettings[K]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value }
      if (key === 'themeId') {
        const id = value as string
        next.appearance = id === 'system' ? 'system' : (themes.find((theme) => theme.id === id)?.mode ?? 'light')
      }
      return next
    })
  }, [setSettings])
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings])
  return { settings, setSettings, updateSetting, resetSettings }
}

/** Formats an ISO date (YYYY-MM-DD) without introducing timezone shifts. */
export function formatTaskDate(
  date: string | null,
  format: DateFormat,
  options?: { includeYear?: boolean },
): string {
  if (!date) return 'No due date'

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date

  const [, year, month, day] = match
  const includeYear = options?.includeYear !== false

  if (format === 'MM/DD/YYYY') return includeYear ? `${month}/${day}/${year}` : `${month}/${day}`
  if (format === 'YYYY-MM-DD') return includeYear ? `${year}-${month}-${day}` : `${month}-${day}`
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`
}
