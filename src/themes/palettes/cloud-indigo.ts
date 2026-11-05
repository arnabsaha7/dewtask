import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'cloud-indigo',
  name: 'Cloud Indigo',
  description: 'A clear, balanced light workspace.',
  mode: 'light',

  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    surfaceHover: '#E8EEF9',
    border: '#E2E8F0',

    text: '#172033',
    textMuted: '#475569',
    textSubtle: '#64748B',

    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primarySoft: '#EEF2FF',

    accent: '#FF5722',
    accentHover: '#E64A19',
    accentSoft: 'rgba(255, 87, 34, 0.10)',

    input: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.42)',
    shadow: '0 18px 50px rgba(15, 23, 42, 0.10)',

    navActiveBg: '#E0E7FF',
    navActiveText: '#1E1B4B',
    navActiveBorder: '#A5B4FC',
    navHoverBg: '#EEF2FF',
    navHoverText: '#24204F',
    navIcon: '#475569',
  },
}

export default theme
