import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'noir-champagne',
  name: 'Noir Champagne',
  description:
    'A sophisticated dark workspace with soft champagne gold and warm neutral tones.',
  mode: 'dark',

  colors: {
    background: '#101010',
    surface: '#202020',
    surfaceElevated: '#2A2927',
    surfaceMuted: '#252422',
    surfaceHover: '#33302B',
    border: '#403A31',

    text: '#F2EBDD',
    textMuted: '#C9BDA9',
    textSubtle: '#9D907D',

    primary: '#B89B72',
    primaryHover: '#CBAE86',
    primarySoft: 'rgba(184, 155, 114, 0.17)',

    accent: '#D8C3A0',
    accentHover: '#E6D3B5',
    accentSoft: 'rgba(216, 195, 160, 0.13)',

    input: '#191919',
    overlay: 'rgba(0, 0, 0, 0.72)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.38)',

    navActiveBg: 'rgba(184, 155, 114, 0.15)',
    navActiveText: '#F2EBDD',
    navActiveBorder: '#B89B72',
    navHoverBg: '#2B2925',
    navHoverText: '#F2EBDD',
    navIcon: '#D8C3A0',
  },
}

export default theme