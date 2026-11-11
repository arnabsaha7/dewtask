import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'nord',
  name: 'Nordic Mist',
  description: 'A cool, calm palette inspired by Nordic tones.',
  mode: 'light',

  colors: {
    background: '#EEF3F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#E6EDF3',
    surfaceHover: '#E5EFF5',
    border: '#D5E0E8',

    text: '#243746',
    textMuted: '#526878',
    textSubtle: '#607787',

    primary: '#477D9E',
    primaryHover: '#356B8C',
    primarySoft: '#E4F0F6',
    primaryText: '#172015',

    accent: '#D97757',
    accentHover: '#C46143',
    accentSoft: 'rgba(217, 119, 87, 0.12)',

    input: '#FFFFFF',
    overlay: 'rgba(24, 39, 52, 0.42)',
    shadow: '0 18px 50px rgba(36, 55, 70, 0.10)',

    navActiveBg: '#DCEAF2',
    navActiveText: '#1D3B4D',
    navActiveBorder: '#85A9BC',
    navHoverBg: '#E5EFF5',
    navHoverText: '#243F50',
    navIcon: '#526878',
  },
}

export default theme
