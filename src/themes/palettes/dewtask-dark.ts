
import type { ThemePalette } from '../types'

// DewTask's signature dark appearance: near-black surfaces,
// cool slate typography, and restrained emerald-teal accents.
const theme: ThemePalette = {
  id: 'dewtask-dark',
  name: 'DewTask Dark',
  description:
    'DewTask’s signature dark theme, inspired by its website identity with deep near-black surfaces, cool slate typography, and subtle emerald-teal accents.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#06080C',
    surface: '#10151D',
    surfaceElevated: '#171F2A',
    surfaceMuted: '#0B0F15',
    surfaceHover: '#1D2734',

    // Borders
    border: '#263344',

    // Typography
    text: '#E8EEF5',
    textMuted: '#A0AEC0',
    textSubtle: '#718096',

    // Primary blue-teal
    primary: '#286F83',
    primaryHover: '#32869A',
    primarySoft: 'rgba(40, 111, 131, 0.16)',
    primaryText: '#FFFFFF',

    // Secondary cool teal
    accent: '#43A6BA',
    accentHover: '#59B9CA',
    accentSoft: 'rgba(67, 166, 186, 0.13)',

    // Inputs, overlays and shadows
    input: '#0B1017',
    overlay: 'rgba(0, 0, 0, 0.76)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.45)',

    // Navigation selected state
    navActiveBg: 'rgba(40, 111, 131, 0.16)',
    navActiveText: '#E8EEF5',
    navActiveBorder: '#286F83',

    // Navigation hover state
    navHoverBg: '#171F2A',
    navHoverText: '#F1F5F9',
    navIcon: '#A0AEC0',
  },
}

export default theme
