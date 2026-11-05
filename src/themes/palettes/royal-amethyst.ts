import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'royal-amethyst',
  name: 'Royal Amethyst',
  description:
    'A regal dark workspace with rich violet surfaces and elegant lavender accents.',
  mode: 'dark',

  colors: {
    background: '#100D19',
    surface: '#1D172B',
    surfaceElevated: '#29213A',
    surfaceMuted: '#241D33',
    surfaceHover: '#342A47',
    border: '#443653',

    text: '#F0EAF8',
    textMuted: '#C9BBD9',
    textSubtle: '#A394B6',

    primary: '#8064A8',
    primaryHover: '#987BC0',
    primarySoft: 'rgba(128, 100, 168, 0.20)',

    accent: '#B69AD8',
    accentHover: '#CBB4E6',
    accentSoft: 'rgba(182, 154, 216, 0.14)',

    input: '#171222',
    overlay: 'rgba(7, 4, 14, 0.76)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.40)',

    navActiveBg: 'rgba(128, 100, 168, 0.20)',
    navActiveText: '#F0EAF8',
    navActiveBorder: '#B69AD8',
    navHoverBg: '#29213A',
    navHoverText: '#F0EAF8',
    navIcon: '#B69AD8',
  },
}

export default theme