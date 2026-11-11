import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'earth',
  name: 'Earth',
  description:
    'A warm, nature-inspired workspace with soft sage green and earthy brown accents.',
  mode: 'light',

  colors: {
    // Main surfaces
    background: '#FDF7F4',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F5EDE8',
    surfaceHover: '#F1E7E1',

    // Borders
    border: '#E5D8D0',

    // Typography
    text: '#685752',
    textMuted: '#806D66',
    textSubtle: '#75635D',

    // Primary interaction: Sage Green
    primary: '#648B5D',
    primaryHover: '#52774C',
    primarySoft: 'rgba(142, 180, 134, 0.20)',
    primaryText: '#172015',

    // Secondary accent: Earth Brown
    accent: '#997C70',
    accentHover: '#80665B',
    accentSoft: 'rgba(153, 124, 112, 0.14)',

    // Inputs
    input: '#FFFFFF',

    // Overlay and shadow
    overlay: 'rgba(55, 42, 36, 0.40)',
    shadow: '0 18px 50px rgba(104, 87, 82, 0.12)',

    // Navigation selected state
    navActiveBg: '#E5EFE1',
    navActiveText: '#685752',
    navActiveBorder: '#8EB486',

    // Navigation hover state
    navHoverBg: '#F2EAE5',
    navHoverText: '#685752',
    navIcon: '#648B5D',
  },
}

export default theme