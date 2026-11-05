import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'sage-garden',
  name: 'Sage Garden',
  description: 'A quiet green palette with gentle contrast.',
  mode: 'light',

  colors: {
    background: '#F3F6F1',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#EAF0E7',
    surfaceHover: '#E7EEE4',
    border: '#DCE5D8',

    text: '#26352A',
    textMuted: '#526451',
    textSubtle: '#64745F',

    primary: '#527A5B',
    primaryHover: '#416849',
    primarySoft: '#E8F0E6',

    accent: '#B7793E',
    accentHover: '#98602F',
    accentSoft: 'rgba(183, 121, 62, 0.12)',

    input: '#FFFFFF',
    overlay: 'rgba(38, 53, 42, 0.40)',
    shadow: '0 18px 50px rgba(38, 53, 42, 0.10)',

    navActiveBg: '#DCE8D8',
    navActiveText: '#203B27',
    navActiveBorder: '#8AA184',
    navHoverBg: '#E7EEE4',
    navHoverText: '#263D2B',
    navIcon: '#526451',
  },
}

export default theme
