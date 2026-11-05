
import { getTheme } from './registry'

export function applyTheme(themeId: string, systemPrefersDark = false) {
  const selected =
    themeId === 'system'
      ? systemPrefersDark
        ? getTheme('midnight')
        : getTheme('cloud-indigo')
      : getTheme(themeId)

  const root = document.documentElement

  root.dataset.theme = selected.mode
  root.dataset.themeId = themeId
  root.style.colorScheme = selected.mode

  const vars: Record<string, string> = {
    // Main surfaces
    '--tn-bg': selected.colors.background,
    '--tn-surface': selected.colors.surface,
    '--tn-surface-elevated': selected.colors.surfaceElevated,
    '--tn-surface-muted': selected.colors.surfaceMuted,
    '--tn-surface-hover': selected.colors.surfaceHover,

    // Borders
    '--tn-border': selected.colors.border,

    // Typography
    '--tn-text': selected.colors.text,
    '--tn-text-muted': selected.colors.textMuted,
    '--tn-text-subtle': selected.colors.textSubtle,

    // Primary accent
    '--tn-primary': selected.colors.primary,
    '--tn-primary-hover': selected.colors.primaryHover,
    '--tn-primary-soft': selected.colors.primarySoft,

    // Secondary accent
    '--tn-accent': selected.colors.accent,
    '--tn-accent-hover': selected.colors.accentHover,
    '--tn-accent-soft': selected.colors.accentSoft,

    // Inputs and overlays
    '--tn-input': selected.colors.input,
    '--tn-overlay': selected.colors.overlay,
    '--tn-shadow': selected.colors.shadow,

    // Navigation selected state
    '--tn-nav-active-bg': selected.colors.navActiveBg,
    '--tn-nav-active-text': selected.colors.navActiveText,
    '--tn-nav-active-border': selected.colors.navActiveBorder,

    // Navigation hover state
    '--tn-nav-hover-bg': selected.colors.navHoverBg,
    '--tn-nav-hover-text': selected.colors.navHoverText,
    '--tn-nav-icon': selected.colors.navIcon,
  }

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value)
  }
}
