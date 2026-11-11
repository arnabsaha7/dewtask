
export interface ThemePalette {
  id: string
  name: string
  description: string
  mode: 'light' | 'dark'
  colors: {
    background: string
    surface: string
    surfaceElevated: string
    surfaceMuted: string
    border: string
    text: string
    textMuted: string
    textSubtle: string
    primary: string
    primaryHover: string
    primarySoft: string
    primaryText: string
    input: string
    overlay: string
    shadow: string
    surfaceHover: string
    navActiveBg: string
    navActiveText: string
    navActiveBorder: string
    navHoverBg: string
    navHoverText: string
    navIcon: string
    accent: string
    accentHover: string
    accentSoft: string
  }
}
