
import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'sunset',
  name: 'Sunset',
  description:
    'A warm and inviting workspace inspired by soft peach, sunset coral and earthy terracotta tones.',
  mode: 'light',

  colors: {
    // Main surfaces
    background: '#FFF7F0',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#FFF0E6',
    surfaceHover: '#FFE2D1',

    // Borders
    border: '#F2D8C8',

    // Typography
    text: '#713F32',
    textMuted: '#946B5C',
    textSubtle: '#AC8879',

    // Primary interaction: Sunset Coral
    primary: '#F07850',
    primaryHover: '#DD6340',
    primarySoft: 'rgba(255, 179, 138, 0.24)',
    primaryText: '#172015',

    // Secondary accent: Peach
    accent: '#FFB38A',
    accentHover: '#F39C70',
    accentSoft: 'rgba(255, 179, 138, 0.18)',

    // Inputs
    input: '#FFFFFF',

    // Overlay and shadow
    overlay: 'rgba(113, 63, 50, 0.40)',
    shadow: '0 18px 50px rgba(113, 63, 50, 0.09)',

    // Navigation selected state
    navActiveBg: '#FFE2D1',
    navActiveText: '#713F32',
    navActiveBorder: '#FFB38A',

    // Navigation hover state
    navHoverBg: '#FFF0E6',
    navHoverText: '#713F32',
    navIcon: '#F07850',
  },
}

export default theme
