import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'midnight-sapphire',
  name: 'Midnight Sapphire',
  description:
    'A polished executive workspace with midnight navy surfaces and refined sapphire-blue accents.',
  mode: 'dark',

  colors: {
    background: '#080F1C',
    surface: '#131F32',
    surfaceElevated: '#1C2B42',
    surfaceMuted: '#18263A',
    surfaceHover: '#263750',
    border: '#34465F',

    text: '#EAF0F8',
    textMuted: '#B9C8DB',
    textSubtle: '#8FA3BE',

    primary: '#426A9A',
    primaryHover: '#5882B3',
    primarySoft: 'rgba(66, 106, 154, 0.20)',

    accent: '#8EADD5',
    accentHover: '#A8C1E1',
    accentSoft: 'rgba(142, 173, 213, 0.14)',

    input: '#0E1929',
    overlay: 'rgba(3, 8, 17, 0.76)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.40)',

    navActiveBg: 'rgba(66, 106, 154, 0.20)',
    navActiveText: '#EAF0F8',
    navActiveBorder: '#8EADD5',
    navHoverBg: '#1C2B42',
    navHoverText: '#EAF0F8',
    navIcon: '#8EADD5',
  },
}

export default theme