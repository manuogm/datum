// AppLayout: the frame every screen renders in. Connects the PitHeader to the
// viewer's settings; screens choose the active tab, the project chip and
// whether the tool actions are shown. Tool screens that pass no chip show the
// active project's; clicking the chip opens that project.
import type { ReactNode } from 'react'
import styles from './AppLayout.module.css'
import { NAV_ITEMS } from './navigation'
import { useActiveProjectChip } from './projects/useActiveProjectChip'
import { routeHref, type Section } from './router/routes'
import { useSettings } from './settings/settings'
import { cx, PitHeader, type ProjectContext, type ToolActions } from './ui'
import { CURRENT_USER } from './user.fixtures'

interface AppLayoutProps {
  section: Section | null
  project?: ProjectContext
  toolActions?: ToolActions
  /** surface for tool screens (default); page for the darker Home backdrop. */
  background?: 'surface' | 'page'
  children: ReactNode
}

export function AppLayout({ section, project, toolActions, background = 'surface', children }: AppLayoutProps) {
  const { theme, toggleTheme, unitSystem, setUnitSystem } = useSettings()
  const activeChip = useActiveProjectChip(section)
  const openActiveProject = activeChip
    ? () => window.location.assign(routeHref({ name: 'project', id: activeChip.projectId }))
    : undefined
  return (
    <div className={cx(styles.frame, background === 'page' && styles.page)}>
      <PitHeader
        nav={NAV_ITEMS}
        activeKey={section}
        homeHref={routeHref({ name: 'home' })}
        project={project ?? activeChip}
        onProjectClick={project ? undefined : openActiveProject}
        unitSystem={unitSystem}
        onUnitSystemChange={setUnitSystem}
        theme={theme}
        onToggleTheme={toggleTheme}
        toolActions={toolActions}
        user={CURRENT_USER}
      />
      <main className={styles.body}>{children}</main>
    </div>
  )
}
