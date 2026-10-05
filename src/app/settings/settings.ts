// App-wide viewer preferences (colour theme and unit system) and the hook
// screens use to read or change them.
import { createContext, useContext } from 'react'

export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

export const UNIT_SYSTEMS = ['si', 'imperial'] as const
export type UnitSystem = (typeof UNIT_SYSTEMS)[number]

export interface Settings {
  theme: Theme
  toggleTheme: () => void
  unitSystem: UnitSystem
  setUnitSystem: (system: UnitSystem) => void
}

export const SettingsContext = createContext<Settings | null>(null)

export function useSettings(): Settings {
  const settings = useContext(SettingsContext)
  if (!settings) throw new Error('useSettings must be used inside <SettingsProvider>')
  return settings
}
