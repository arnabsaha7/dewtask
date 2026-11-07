import type { ThemePalette } from '../types'

// A refined monochromatic theme with layered charcoal surfaces and silver accents.
const theme: ThemePalette = {
  id: 'graphite',
  name: 'Graphite',
  description:
    'A refined monochromatic dark theme with layered charcoal surfaces, crisp typography, and restrained silver accents.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#0B0C0E',
    surface: '#181A1D',
    surfaceElevated: '#202327',
    surfaceMuted: '#111214',
    surfaceHover: '#25292E',

    // Borders
    border: '#2B2F34',

    // Typography
    text: '#F1F3F5',
    textMuted: '#A6ADB7',
    textSubtle: '#858D98',

    // Primary graphite-silver accent
    // Darker fills preserve strong contrast with the light button text.
    primary: '#596575',
    primaryHover: '#5D6878',
    primarySoft: 'rgba(89, 101, 117, 0.16)',

    // Secondary graphite accent
    accent: '#929BA6',
    accentHover: '#A0A8B2',
    accentSoft: 'rgba(146, 155, 166, 0.12)',

    // Inputs, overlays and shadows
    input: '#141619',
    overlay: 'rgba(0, 0, 0, 0.78)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.48)',

    // Navigation selected state
    navActiveBg: 'rgba(89, 101, 117, 0.16)',
    navActiveText: '#F1F3F5',
    navActiveBorder: '#596575',

    // Navigation hover state
    navHoverBg: '#202327',
    navHoverText: '#F1F3F5',
    navIcon: '#A6ADB7',
  },
}

export default theme
