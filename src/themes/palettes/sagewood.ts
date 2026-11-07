
import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'sagewood',
  name: 'Sagewood',
  description:
    'A calm, understated botanical workspace with deep charcoal-green surfaces, muted sage accents and warm natural neutrals.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#141916',
    surface: '#1D2520',
    surfaceElevated: '#28312A',
    surfaceMuted: '#222B25',
    surfaceHover: '#303B32',

    // Borders
    border: '#39453C',

    // Typography
    text: '#E8E9DE',
    textMuted: '#B9BFB4',
    textSubtle: '#9CA79A',

    // Primary: Muted Sage
    primary: '#A8B99B',
    primaryHover: '#BAC9AD',
    primarySoft: 'rgba(168, 185, 155, 0.13)',

    // Accent: Warm Natural Ivory
    accent: '#D9BB83',
    accentHover: '#E5CCA0',
    accentSoft: 'rgba(217, 187, 131, 0.11)',

    // Inputs
    input: '#191F1B',

    // Overlay and shadow
    overlay: 'rgba(5, 9, 6, 0.76)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.32)',

    // Navigation
    navActiveBg: 'rgba(168, 185, 155, 0.12)',
    navActiveText: '#E8E9DE',
    navActiveBorder: '#A8B99B',
    navHoverBg: '#28312A',
    navHoverText: '#E8E9DE',
    navIcon: '#B9C7AA',
  },
}

export default theme
