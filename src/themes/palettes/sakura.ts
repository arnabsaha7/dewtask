import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'sakura',
  name: 'Sakura',
  description:
    'A soft, elegant workspace with blush backgrounds, rose accents, and deep berry details.',
  mode: 'light',

  colors: {
    // Main surfaces
    background: '#FFF7F9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#FFF1F5',
    surfaceHover: '#FCE7EF',

    // Borders
    border: '#F3D5DF',

    // Typography
    text: '#70243F',
    textMuted: '#982044',
    textSubtle: '#B06A82',

    // Primary interaction: Rose
    primary: '#F0527D',
    primaryHover: '#DB3565',
    primarySoft: 'rgba(240, 82, 125, 0.16)',
    primaryText: '#172015',

    // Secondary accent: Dusty Rose
    accent: '#D98BA3',
    accentHover: '#C47791',
    accentSoft: 'rgba(217, 139, 163, 0.16)',

    // Inputs
    input: '#FFFFFF',

    // Overlay and shadow
    overlay: 'rgba(80, 31, 52, 0.40)',
    shadow: '0 18px 50px rgba(128, 31, 61, 0.10)',

    // Navigation selected state
    navActiveBg: '#FFE4EC',
    navActiveText: '#801F3D',
    navActiveBorder: '#FDA4BC',

    // Navigation hover state
    navHoverBg: '#FFF1F5',
    navHoverText: '#801F3D',
    navIcon: '#DB3565',
  },
}

export default theme