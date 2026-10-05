// PitHeader: the 56px top bar of every screen. Tool pages pass toolActions to
// show "Save revision" and "PDF report"; screens tied to a project pass it to
// show the project chip.
import type { Theme, UnitSystem } from '../settings/settings'
import styles from './PitHeader.module.css'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Logo } from './Logo'
import { ProjectChip, type ProjectContext } from './ProjectChip'
import { SegmentedControl } from './SegmentedControl'
import { TabBar, type TabItem } from './TabBar'
import { ThemeToggle } from './ThemeToggle'

export interface ToolActions {
  onSaveRevision: () => void
  onDownloadReport: () => void
}

const UNIT_OPTIONS: readonly { value: UnitSystem; label: string }[] = [
  { value: 'si', label: 'SI' },
  { value: 'imperial', label: 'Imperial' },
]

interface PitHeaderProps {
  nav: readonly TabItem[]
  activeKey: string | null
  homeHref: string
  project?: ProjectContext
  onProjectClick?: () => void
  unitSystem: UnitSystem
  onUnitSystemChange: (system: UnitSystem) => void
  theme: Theme
  onToggleTheme: () => void
  toolActions?: ToolActions
  user: { initials: string; name: string }
}

export function PitHeader({
  nav,
  activeKey,
  homeHref,
  project,
  onProjectClick,
  unitSystem,
  onUnitSystemChange,
  theme,
  onToggleTheme,
  toolActions,
  user,
}: PitHeaderProps) {
  return (
    <header className={styles.header}>
      <Logo href={homeHref} />
      <TabBar className={styles.nav} items={nav} activeKey={activeKey} label="Main" size="header" />
      <div className={styles.spacer} />
      {project && (
        <div className={styles.project}>
          <ProjectChip {...project} onClick={onProjectClick} />
        </div>
      )}
      <SegmentedControl
        className={styles.units}
        options={UNIT_OPTIONS}
        value={unitSystem}
        onChange={onUnitSystemChange}
        label="Unit system"
      />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      {toolActions && (
        <div className={styles.actions}>
          <Button size="md" icon="save" onClick={toolActions.onSaveRevision}>
            <span className={styles.actionLabel}>Save revision</span>
          </Button>
          <Button size="md" variant="primary" icon="download" onClick={toolActions.onDownloadReport}>
            <span className={styles.actionLabel}>PDF report</span>
          </Button>
        </div>
      )}
      <Avatar initials={user.initials} name={user.name} size="lg" />
    </header>
  )
}
