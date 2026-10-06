// PitHeader: the 56px top bar of every screen. The logo, then the document
// tabs (Home and the open calculations, passed in by the shell), then the
// current screen's actions (e.g. a calculation's Report), the Materials
// button and the viewer's units and theme.
import type { ReactNode } from 'react'
import type { Theme, UnitSystem } from '../settings/settings'
import styles from './PitHeader.module.css'
import { Button } from './Button'
import { cx } from './cx'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SegmentedControl } from './SegmentedControl'
import { ThemeToggle } from './ThemeToggle'

const UNIT_OPTIONS: readonly { value: UnitSystem; label: string }[] = [
  { value: 'si', label: 'SI' },
  { value: 'imperial', label: 'Imperial' },
]

interface PitHeaderProps {
  homeHref: string
  /** The document tabs. */
  tabs: ReactNode
  /** Actions of the current screen, shown before the Materials button. */
  actions?: ReactNode
  materialsHref: string
  /** The Materials page is the one shown. */
  materialsActive: boolean
  unitSystem: UnitSystem
  onUnitSystemChange: (system: UnitSystem) => void
  theme: Theme
  onToggleTheme: () => void
}

export function PitHeader({
  homeHref,
  tabs,
  actions,
  materialsHref,
  materialsActive,
  unitSystem,
  onUnitSystemChange,
  theme,
  onToggleTheme,
}: PitHeaderProps) {
  return (
    <header className={styles.header}>
      <Logo href={homeHref} markOnPhone />
      <div className={styles.tabs}>{tabs}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
      <span className={cx(styles.materials, materialsActive && styles.materialsActive)}>
        <Button size="md" variant="ghost" href={materialsHref}>
          <Icon name="tool-mat" size={14} />
          <span className={styles.actionLabel}>Materials</span>
        </Button>
      </span>
      <SegmentedControl
        className={styles.units}
        options={UNIT_OPTIONS}
        value={unitSystem}
        onChange={onUnitSystemChange}
        label="Unit system"
      />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  )
}
