// Chip: small bordered label. "check" and "filter" chips toggle (pass
// selected + onClick); "tag" is a static label; "add" is a dashed action.
import type { ReactNode } from 'react'
import styles from './Chip.module.css'
import { cx } from './cx'

interface ChipProps {
  children: ReactNode
  variant?: 'check' | 'filter' | 'tag' | 'add'
  selected?: boolean
  onClick?: () => void
  /** Content before the label, e.g. a Marker. */
  leading?: ReactNode
}

export function Chip({ children, variant = 'check', selected = false, onClick, leading }: ChipProps) {
  const classes = cx(styles.chip, styles[variant], selected && styles.selected)
  const toggles = variant === 'check' || variant === 'filter'
  const content = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      {variant === 'check' && selected && <span aria-hidden="true">✓</span>}
      {children}
    </>
  )
  if (!onClick) return <span className={classes}>{content}</span>
  return (
    <button type="button" className={classes} onClick={onClick} aria-pressed={toggles ? selected : undefined}>
      {content}
    </button>
  )
}
