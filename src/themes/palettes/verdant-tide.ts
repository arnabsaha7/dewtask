import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'verdant-tide',
  name: 'Verdant Tide',
  description:
    'A refreshing workspace blending deep ocean teal, soft aquatic neutrals and warm amber accents, inspired by coastal landscapes.',
  mode: 'light',

  colors: {
    // Main surfaces
    background: '#F4F8F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#EAF2F0',
    surfaceHover: '#DFEBE8',

    // Borders
    border: '#D1E0DC',

    // Typography
    text: '#304C50',
    textMuted: '#526D70',
    textSubtle: '#718789',

    // Primary interaction: Ocean Teal
    primary: '#287F80',
    primaryHover: '#216B6C',
    primarySoft: 'rgba(40, 127, 128, 0.14)',
    primaryText: '#FFFFFF',

    // Secondary accent: Warm Amber
    accent: '#D68A42',
    accentHover: '#B97432',
    accentSoft: 'rgba(214, 138, 66, 0.15)',

    // Inputs
    input: '#FFFFFF',

    // Overlay and shadow
    overlay: 'rgba(35, 61, 62, 0.42)',
    shadow: '0 18px 50px rgba(48, 76, 80, 0.11)',

    // Navigation selected state
    navActiveBg: '#287F80',
    navActiveText: '#FFFFFF',
    navActiveBorder: '#216B6C',

    // Navigation hover state
    navHoverBg: '#EAF2F0',
    navHoverText: '#304C50',
    navIcon: '#287F80',
  },
}

export default theme