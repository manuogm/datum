// Chip: small bordered label. "check" and "filter" chips toggle (pass
// selected + onClick); "option" chips are one choice of a row, like load case
// tabs; "tag" is a static label; "add" is a dashed action.
import type { ReactNode } from 'react'
import styles from './Chip.module.css'
import { cx } from './cx'

interface ChipProps {
  children: ReactNode
  variant?: 'check' | 'filter' | 'option' | 'tag' | 'add'
  selected?: boolean
  onClick?: () => void
  /** Content before the label, e.g. a Marker. */
  leading?: ReactNode
  /** Mono label, for codes such as fit designations (H7/g6). */
  mono?: boolean
}

export function Chip({ children, variant = 'check', selected = false, onClick, leading, mono = false }: ChipProps) {
  const classes = cx(styles.chip, styles[variant], selected && styles.selected, mono && styles.mono)
  const toggles = variant === 'check' || variant === 'filter' || variant === 'option'
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
