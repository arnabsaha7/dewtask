import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'vesper',
  name: 'Vesper',
  description:
    'A quiet, atmospheric workspace with deep plum surfaces, softened amethyst accents and warm lavender neutrals.',
  mode: 'dark',

  colors: {
    background: '#100E1A',
    surface: '#1F1A2D',
    surfaceElevated: '#2B2540',
    surfaceMuted: '#262037',
    surfaceHover: '#362F4B',
    border: '#49415E',

    text: '#F4F0FA',
    textMuted: '#CEC5DD',
    textSubtle: '#AA9DBD',

    primary: '#B49AD9',
    primaryHover: '#C3ACE3',
    primarySoft: 'rgba(180, 154, 217, 0.15)',
    primaryText: '#172015',

    accent: '#D6C2F2',
    accentHover: '#E2D3F6',
    accentSoft: 'rgba(214, 194, 242, 0.12)',

    input: '#181423',
    overlay: 'rgba(7, 4, 14, 0.78)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.42)',

    navActiveBg: 'rgba(180, 154, 217, 0.14)',
    navActiveText: '#F4F0FA',
    navActiveBorder: '#D6C2F2',
    navHoverBg: '#2B2540',
    navHoverText: '#F4F0FA',
    navIcon: '#D6C2F2',
  },
}

export default theme
