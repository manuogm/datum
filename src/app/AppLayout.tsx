// AppLayout: the frame every screen renders in. Connects the PitHeader to the
// viewer's settings and the document tabs; screens say which tab is current
// and may add their own actions to the bar (a calculation's Report button).
import type { ReactNode } from 'react'
import styles from './AppLayout.module.css'
import { routeHref } from './router/routes'
import { useSettings } from './settings/settings'
import { DocumentTabs, type CurrentTab } from './shell/DocumentTabs'
import { cx, PitHeader } from './ui'

interface AppLayoutProps {
  /** The tab marked as shown; 'materials' marks the Materials button instead. */
  current: CurrentTab | 'materials'
  actions?: ReactNode
  /** surface for tool screens (default); page for the darker Home backdrop. */
  background?: 'surface' | 'page'
  children: ReactNode
}

export function AppLayout({ current, actions, background = 'surface', children }: AppLayoutProps) {
  const { theme, toggleTheme, unitSystem, setUnitSystem } = useSettings()
  return (
    <div className={cx(styles.frame, background === 'page' && styles.page)}>
      <PitHeader
        homeHref={routeHref({ name: 'home', folderId: null })}
        tabs={<DocumentTabs current={current === 'materials' ? null : current} />}
        actions={actions}
        materialsHref={routeHref({ name: 'materials' })}
        materialsActive={current === 'materials'}
        unitSystem={unitSystem}
        onUnitSystemChange={setUnitSystem}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className={styles.body}>{children}</main>
    </div>
  )
}
