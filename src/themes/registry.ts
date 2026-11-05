import type { ThemePalette } from './types'

const modules = import.meta.glob<ThemePalette>('./palettes/*.ts', {
  eager: true,
  import: 'default',
})

export const themes = Object.values(modules).sort((a, b) => a.name.localeCompare(b.name))
export const DEFAULT_THEME_ID = 'cloud-indigo'
export const SYSTEM_THEME_ID = 'system'

export function getTheme(id: string): ThemePalette {
  return themes.find((theme) => theme.id === id)
    ?? themes.find((theme) => theme.id === DEFAULT_THEME_ID)!
}
