import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'warm-paper',
  name: 'Warm Paper',
  description: 'A softer, warm neutral workspace.',
  mode: 'light',

  colors: {
    background: '#F7F5F0',
    surface: '#FFFEFA',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F1EEE7',
    surfaceHover: '#F4F0FA',
    border: '#E7E1D8',

    text: '#292720',
    textMuted: '#625E54',
    textSubtle: '#746F63',

    primary: '#7866C6',
    primaryHover: '#6652B4',
    primarySoft: '#F0ECFA',

    accent: '#C46A45',
    accentHover: '#A95534',
    accentSoft: 'rgba(196, 106, 69, 0.12)',

    input: '#FFFEFA',
    overlay: 'rgba(41, 39, 32, 0.40)',
    shadow: '0 18px 50px rgba(41, 39, 32, 0.10)',

    navActiveBg: '#EEE8F8',
    navActiveText: '#352A50',
    navActiveBorder: '#B5A5D8',
    navHoverBg: '#F4F0FA',
    navHoverText: '#403454',
    navIcon: '#625E54',
  },
}

export default theme
