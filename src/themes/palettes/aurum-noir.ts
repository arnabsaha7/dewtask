
import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'aurum-noir',
  name: 'Aurum Noir',
  description:
    'An elegant charcoal workspace with refined champagne gold, muted botanical undertones and sophisticated neutral surfaces.',
  mode: 'dark',

  colors: {
    // Base surfaces
    background: '#0D1113',
    surface: '#171D20',
    surfaceElevated: '#20282B',
    surfaceMuted: '#1B2326',
    surfaceHover: '#293438',
    border: '#354247',

    // Typography
    text: '#F4F1E9',
    textMuted: '#C3C9C5',
    textSubtle: '#9BA9A4',

    // Primary - Champagne gold
    primary: '#D6B779',
    primaryHover: '#E5C98D',
    primarySoft: 'rgba(214, 183, 121, 0.15)',
    primaryText: '#172015',

    // Accent - Muted champagne ivory
    accent: '#E4D5B8',
    accentHover: '#F0E4CE',
    accentSoft: 'rgba(228, 213, 184, 0.12)',

    // Inputs and effects
    input: '#13191C',
    overlay: 'rgba(0, 0, 0, 0.76)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.42)',

    // Navigation
    navActiveBg: 'rgba(214, 183, 121, 0.14)',
    navActiveText: '#F4F1E9',
    navActiveBorder: '#D6B779',
    navHoverBg: '#20282B',
    navHoverText: '#F4F1E9',
    navIcon: '#D6B779',
  },
}

export default theme
