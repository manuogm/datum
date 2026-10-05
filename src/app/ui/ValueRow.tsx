// ValueRow: a labelled value ("Service temp.  −20 … 140 °C"), optionally in a
// boxed mono well as in the requirement lists.
import type { ReactNode } from 'react'
import styles from './ValueRow.module.css'
import { cx } from './cx'

interface ValueRowProps {
  label: ReactNode
  value: ReactNode
  unit?: string
  boxed?: boolean
  size?: 'sm' | 'md'
}

export function ValueRow({ label, value, unit, boxed = false, size = 'md' }: ValueRowProps) {
  return (
    <div className={cx(styles.row, styles[size])}>
      <span className={styles.label}>{label}</span>
      <span className={cx(styles.value, boxed && styles.boxed)}>
        {value}
        {unit && <span className={styles.unit}> {unit}</span>}
      </span>
    </div>
  )
}
