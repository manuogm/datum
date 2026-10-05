// Column: one of the flush, full-height columns of a tool screen. Put a
// ColumnHeader first; the remaining children scroll inside the column.
import type { ReactNode } from 'react'
import styles from './Column.module.css'
import { cx } from './cx'

interface ColumnProps {
  /** Fixed design widths, or fill for the flexible centre column. */
  width?: 'fill' | 'filters' | 'inputs' | 'results' | 'sidebar' | 'drawer'
  /** Draw the rule on the right edge (off for the last column). */
  divider?: boolean
  header?: ReactNode
  children: ReactNode
  label?: string
  className?: string
}

export function Column({ width = 'fill', divider = true, header, children, label, className }: ColumnProps) {
  return (
    <section className={cx(styles.column, styles[width], divider && styles.divider, className)} aria-label={label}>
      {header}
      <div className={styles.body}>{children}</div>
    </section>
  )
}
