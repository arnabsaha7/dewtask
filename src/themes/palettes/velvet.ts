
import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'velvet',
  name: 'Velvet',
  description:
    'An elegant editorial workspace inspired by rich burgundy, warm parchment, muted rose and sophisticated wine tones.',
  mode: 'light',

  colors: {
    // Main surfaces
    background: '#F8F4EF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F1EAE4',
    surfaceHover: '#EDE3DA',

    // Borders
    border: '#E5D5D0',

    // Typography
    text: '#351923',
    textMuted: '#75535B',
    textSubtle: '#987C80',

    // Primary interaction: Burgundy
    primary: '#702C3D',
    primaryHover: '#5C2232',
    primarySoft: 'rgba(112, 44, 61, 0.12)',
    primaryText: '#FFFFFF',

    // Secondary accent: Dusty Rose
    accent: '#A33D52',
    accentHover: '#8B3045',
    accentSoft: 'rgba(163, 61, 82, 0.12)',

    // Inputs
    input: '#FFFFFF',

    // Overlay and shadow
    overlay: 'rgba(53, 25, 35, 0.45)',
    shadow: '0 18px 50px rgba(53, 25, 35, 0.10)',

    // Navigation selected state
    navActiveBg: '#F0E0E3',
    navActiveText: '#702C3D',
    navActiveBorder: '#A33D52',

    // Navigation hover state
    navHoverBg: '#F1EAE4',
    navHoverText: '#351923',
    navIcon: '#702C3D',
  },
}

export default theme
