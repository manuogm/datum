// MoreOptions: the disclosure that keeps a step's advanced inputs out of the
// way ("More options · 4", with "2 changed" when some differ from their
// defaults, so a hidden setting that matters is never silent). Collapsed by
// default; with a memoryKey it stays open or closed while the page is open.
import { useId, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'
import styles from './MoreOptions.module.css'
import { useSessionState } from './sessionMemory'

interface MoreOptionsProps {
  children: ReactNode
  /** Default "More options". */
  label?: string
  /** How many inputs are inside. */
  count?: number
  /** How many of them differ from their defaults (accent note when > 0). */
  changed?: number
  defaultOpen?: boolean
  /** Remember open / closed under this key while the page is open. */
  memoryKey?: string
  className?: string
}

export function MoreOptions({ children, label = 'More options', count, changed = 0, defaultOpen = false, memoryKey, className }: MoreOptionsProps) {
  const [open, setOpen] = useSessionState(memoryKey === undefined ? undefined : `more:${memoryKey}`, defaultOpen)
  const panelId = useId()
  return (
    <div className={cx(styles.more, open && styles.open, className)}>
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <Icon name="chevron-right" className={styles.chevron} />
        <span className={styles.label}>{label}</span>
        {count !== undefined && <span className={styles.count}>{count}</span>}
        {changed > 0 && <span className={styles.changed}>{changed} changed</span>}
      </button>
      <div className={styles.panel} id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  )
}
