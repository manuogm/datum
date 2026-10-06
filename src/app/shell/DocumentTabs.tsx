// DocumentTabs: the tabs of the top bar. Home comes first and cannot be
// closed; then one tab per open calculation (tool glyph, name, ×). A tab whose
// calculation no longer exists is dropped. Closing the tab being shown moves
// to its neighbour, or back to Home when it was the last one.
import { useEffect } from 'react'
import { findCalculation, type Calculation } from '../../core/library'
import { useLibrary } from '../library/useLibrary'
import { calcHref, folderHref } from '../router/routes'
import { cx, Icon } from '../ui'
import styles from './DocumentTabs.module.css'
import { closeTab, lastHomeFolder, useOpenTabs } from './openTabs'
import { tabAfterClosing } from './tabList'
import { TOOL_ICONS } from './toolIcons'

/** Which tab is shown: Home, a calculation's, or none (the Materials page). */
export type CurrentTab = { tab: 'home' } | { tab: 'calc'; id: string } | null

export function DocumentTabs({ current }: { current: CurrentTab }) {
  const { library } = useLibrary()
  const ids = useOpenTabs()
  const calculations = ids.flatMap((id) => findCalculation(library, id) ?? [])

  // Forget tabs of calculations deleted here or in another browser tab.
  useEffect(() => {
    for (const id of ids) if (!findCalculation(library, id)) closeTab(id)
  }, [ids, library])

  const currentId = current?.tab === 'calc' ? current.id : null
  const close = (id: string) => {
    if (id === currentId) {
      const next = tabAfterClosing(calculations.map((c) => c.id), id)
      window.location.assign(next ? calcHref(next) : folderHref(lastHomeFolder()))
    }
    closeTab(id)
  }

  return (
    <nav className={styles.bar} aria-label="Open documents">
      <a
        className={cx(styles.tab, styles.home, current?.tab === 'home' && styles.active)}
        href={folderHref(lastHomeFolder())}
        aria-current={current?.tab === 'home' ? 'page' : undefined}
      >
        Home
      </a>
      {calculations.map((calculation) => (
        <CalculationTab key={calculation.id} calculation={calculation} active={calculation.id === currentId} onClose={close} />
      ))}
    </nav>
  )
}

interface CalculationTabProps {
  calculation: Calculation
  active: boolean
  onClose: (id: string) => void
}

function CalculationTab({ calculation, active, onClose }: CalculationTabProps) {
  const { id, name, tool } = calculation
  return (
    <div
      className={cx(styles.tab, styles.calc, active && styles.active)}
      // Middle click closes, as in a browser.
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault()
          onClose(id)
        }
      }}
    >
      <a className={styles.link} href={calcHref(id)} title={name} aria-current={active ? 'page' : undefined}>
        <Icon name={TOOL_ICONS[tool]} size={12} className={styles.glyph} />
        <span className={styles.name}>{name}</span>
      </a>
      <button type="button" className={styles.close} onClick={() => onClose(id)} aria-label={`Close ${name}`}>
        <Icon name="close" size={10} />
      </button>
    </div>
  )
}
