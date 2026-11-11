
import type { ThemePalette } from '../types'

// A refined slate workspace with softened teal and muted burnt-copper accents.
const theme: ThemePalette = {
  id: 'sable',
  name: 'Sable',
  description:
    'A sophisticated slate workspace with calm mineral teal, cool charcoal surfaces and understated burnt-copper accents.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#1C232A',
    surface: '#272F38',
    surfaceElevated: '#323D47',
    surfaceMuted: '#2B343D',
    surfaceHover: '#3A4650',

    // Borders
    border: '#414D57',

    // Typography
    text: '#F0F2F2',
    textMuted: '#C0C9CE',
    textSubtle: '#9EABB3',

    // Primary: Muted mineral teal
    primary: '#83B5B5',
    primaryHover: '#99C5C3',
    primarySoft: 'rgba(131, 181, 181, 0.15)',
    primaryText: '#172015',

    // Secondary accent: Burnt copper
    accent: '#C78360',
    accentHover: '#D69773',
    accentSoft: 'rgba(199, 131, 96, 0.14)',

    // Inputs
    input: '#202830',

    // Overlay and shadow
    overlay: 'rgba(8, 12, 16, 0.76)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.36)',

    // Navigation selected state
    navActiveBg: 'rgba(131, 181, 181, 0.13)',
    navActiveText: '#F0F2F2',
    navActiveBorder: '#C78360',

    // Navigation hover
    navHoverBg: '#323D47',
    navHoverText: '#F0F2F2',
    navIcon: '#A9C9C5',
  },
}

export default theme
