import type { ThemePalette } from '../types'

// A calm slate workspace with teal accents and a warm orange highlight.
const theme: ThemePalette = {
  id: 'slate-ember',
  name: 'Slate & Ember',
  description: 'A calm slate workspace with teal accents and a warm orange highlight.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#1E242B',
    surface: '#262D35',
    surfaceElevated: '#303841',
    surfaceMuted: '#2B333C',
    surfaceHover: '#38424C',

    // Borders
    border: '#3B4650',

    // Typography
    text: '#F5F5F5',
    textMuted: '#C2CBD1',
    textSubtle: '#9AA5AD',

    // Primary teal
    primary: '#76ABAE',
    primaryHover: '#8AB8BA',
    primarySoft: 'rgba(118, 171, 174, 0.16)',

    // Secondary accent: ember orange
    accent: '#FF5722',
    accentHover: '#E64A19',
    accentSoft: 'rgba(255, 87, 34, 0.16)',

    // Inputs, overlay and shadow
    input: '#1A2027',
    overlay: 'rgba(10, 14, 18, 0.72)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.4)',

    // Navigation selected state
    navActiveBg: 'rgba(118, 171, 174, 0.14)',
    navActiveText: '#F5F5F5',
    navActiveBorder: '#FF5722',

    // Navigation hover
    navHoverBg: '#2D353E',
    navHoverText: '#F5F5F5',
    navIcon: '#76ABAE',
  },
}

export default theme
