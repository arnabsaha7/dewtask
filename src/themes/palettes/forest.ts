import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'forest',
  name: 'Forest',
  description:
    'A deep botanical workspace with rich blue-green surfaces and soft mint accents.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#092635',
    surface: '#12343D',
    surfaceElevated: '#1B4242',
    surfaceMuted: '#163A3D',
    surfaceHover: '#254F4D',

    // Borders
    border: '#315A57',

    // Typography
    text: '#E5F2EC',
    textMuted: '#B5D0C5',
    textSubtle: '#9EC8B9',

    // Primary interaction: Forest Green
    primary: '#5C8374',
    primaryHover: '#719A89',
    primarySoft: 'rgba(92, 131, 116, 0.22)',

    // Secondary accent: Soft Mint
    accent: '#9EC8B9',
    accentHover: '#B5D8CC',
    accentSoft: 'rgba(158, 200, 185, 0.14)',

    // Inputs
    input: '#102F38',

    // Overlay and shadow
    overlay: 'rgba(3, 15, 22, 0.72)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.30)',

    // Navigation selected state
    navActiveBg: 'rgba(92, 131, 116, 0.22)',
    navActiveText: '#E5F2EC',
    navActiveBorder: '#9EC8B9',

    // Navigation hover state
    navHoverBg: '#1B4242',
    navHoverText: '#E5F2EC',
    navIcon: '#9EC8B9',
  },
}

export default theme