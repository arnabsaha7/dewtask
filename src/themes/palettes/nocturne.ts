import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'nocturne',
  name: 'Nocturne',
  description:
    'A composed midnight workspace with layered navy surfaces, softened sapphire accents and crisp cool neutrals.',
  mode: 'dark',

  colors: {
    background: '#0B1220',
    surface: '#141F31',
    surfaceElevated: '#1D2B40',
    surfaceMuted: '#19263A',
    surfaceHover: '#26364D',
    border: '#3A4B63',

    text: '#F1F5FB',
    textMuted: '#C3D0E0',
    textSubtle: '#9EADC2',

    primary: '#83A9D8',
    primaryHover: '#9ABAE2',
    primarySoft: 'rgba(131, 169, 216, 0.15)',

    accent: '#B8D1F0',
    accentHover: '#C9DCF5',
    accentSoft: 'rgba(184, 209, 240, 0.12)',

    input: '#101A2A',
    overlay: 'rgba(3, 8, 17, 0.78)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.42)',

    navActiveBg: 'rgba(131, 169, 216, 0.14)',
    navActiveText: '#F1F5FB',
    navActiveBorder: '#B8D1F0',
    navHoverBg: '#1D2B40',
    navHoverText: '#F1F5FB',
    navIcon: '#B8D1F0',
  },
}

export default theme
