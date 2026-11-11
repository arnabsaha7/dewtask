
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
    '--tn-primary-text': selected.colors.primaryText,

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

  const semanticStatus = selected.mode === 'dark'
    ? {
        '--tn-status-completed': '#6EE7B7',
        '--tn-status-completed-soft': 'rgba(16, 185, 129, 0.16)',
        '--tn-status-progress': '#7DD3FC',
        '--tn-status-progress-soft': 'rgba(14, 165, 233, 0.17)',
        '--tn-status-todo': '#FCD34D',
        '--tn-status-todo-soft': 'rgba(245, 158, 11, 0.17)',
        '--tn-success': '#6EE7B7',
        '--tn-success-soft': 'rgba(16, 185, 129, 0.16)',
        '--tn-danger': '#FCA5A5',
        '--tn-danger-soft': 'rgba(239, 68, 68, 0.16)',
      }
    : {
        '--tn-status-completed': '#047857',
        '--tn-status-completed-soft': '#D1FAE5',
        '--tn-status-progress': '#1D4ED8',
        '--tn-status-progress-soft': '#DBEAFE',
        '--tn-status-todo': '#92400E',
        '--tn-status-todo-soft': '#FEF3C7',
        '--tn-success': '#047857',
        '--tn-success-soft': '#D1FAE5',
        '--tn-danger': '#B91C1C',
        '--tn-danger-soft': '#FEE2E2',
      }

  Object.assign(vars, semanticStatus)

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value)
  }
}
