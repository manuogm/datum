// Holds the viewer's theme and unit system, persists them in localStorage and
// applies the theme to <html data-theme> so the tokens switch.
import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext, THEMES, UNIT_SYSTEMS, type Theme, type UnitSystem } from './settings'
import { readStored, writeStored } from './storage'

const THEME_KEY = 'datum.theme'
const UNIT_SYSTEM_KEY = 'datum.unitSystem'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStored(THEME_KEY, THEMES, 'dark'))
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() =>
    readStored(UNIT_SYSTEM_KEY, UNIT_SYSTEMS, 'si'),
  )

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    writeStored(THEME_KEY, next)
    setTheme(next)
  }, [theme])

  const setUnitSystem = useCallback((system: UnitSystem) => {
    writeStored(UNIT_SYSTEM_KEY, system)
    setUnitSystemState(system)
  }, [])

  const value = useMemo(
    () => ({ theme, toggleTheme, unitSystem, setUnitSystem }),
    [theme, toggleTheme, unitSystem, setUnitSystem],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
