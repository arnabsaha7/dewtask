import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'turquoise-amber-autumn',
  name: 'Turquoise Amber Autumn',
  description:
    'A refreshing workspace blending deep slate blue, vibrant turquoise, soft aqua, and warm autumn accents.',
  mode: 'light',

  colors: {
    background: '#F4F8F8',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#EAF3F4',
    surfaceHover: '#DDECEF',
    border: '#C5DADD',

    text: '#304C64',
    textMuted: '#496777',
    textSubtle: '#718D98',

    primary: '#26788E',
    primaryHover: '#1F6578',
    primarySoft: 'rgba(38, 120, 142, 0.15)',

    accent: '#E2480C',
    accentHover: '#C83E0A',
    accentSoft: 'rgba(226, 72, 12, 0.12)',

    input: '#FFFFFF',
    overlay: 'rgba(23, 48, 62, 0.45)',
    shadow: '0 18px 50px rgba(48, 76, 100, 0.12)',

    navActiveBg: '#f16e3a',
    navActiveText: '#fdfdfc',
    navActiveBorder: '#631B08',
    navHoverBg: '#EAF3F4',
    navHoverText: '#304C64',
    navIcon: '#26788E',
  },
}

export default theme