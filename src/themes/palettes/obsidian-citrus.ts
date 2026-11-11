
import type { ThemePalette } from '../types'

const theme: ThemePalette = {
  id: 'obsidian-citrus',
  name: 'Obsidian Citrus',
  description:
    'A refined dark workspace featuring deep charcoal surfaces, forest-green undertones, electric lime accents and improved readability.',
  mode: 'dark',

  colors: {
    // Main surfaces
    background: '#101311',
    surface: '#1B211D',
    surfaceElevated: '#232C25',
    surfaceMuted: '#1B241E',
    surfaceHover: '#29332C',

    // Borders
    border: '#414D42',

    // Typography
    text: '#F0F4E9',
    textMuted: '#B8C4B3',
    textSubtle: '#A0AEA1',

    // Primary interaction: Electric Lime
    primary: '#B6D957',
    primaryHover: '#C8E76C',
    primarySoft: 'rgba(182, 217, 87, 0.16)',
    primaryText: '#172015',

    // Secondary accent: Citrus Green
    accent: '#D4EA83',
    accentHover: '#E1F29D',
    accentSoft: 'rgba(212, 234, 131, 0.13)',

    // Inputs
    input: '#161C18',

    // Overlay and shadow
    overlay: 'rgba(0, 0, 0, 0.78)',
    shadow: '0 18px 50px rgba(0, 0, 0, 0.42)',

    // Navigation selected state
    navActiveBg: 'rgba(182, 217, 87, 0.14)',
    navActiveText: '#F0F4E9',
    navActiveBorder: '#B6D957',

    // Navigation hover state
    navHoverBg: '#29332C',
    navHoverText: '#F0F4E9',
    navIcon: '#B6D957',
  },
}

export default theme
