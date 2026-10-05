// Column: one of the flush, full-height columns of a tool screen, placed in a
// ColumnRow. Put a ColumnHeader first; the remaining children scroll inside
// the column (or with the page once the row wraps on narrower screens).
import type { ReactNode } from 'react'
import styles from './Column.module.css'
import { cx } from './cx'

interface ColumnProps {
  /** Fixed design widths, or fill for the flexible centre column. */
  width?: 'fill' | 'filters' | 'inputs' | 'results'
  /** Draw the rule on the right edge (off for the last column). */
  divider?: boolean
  /** Below 1200px, move to a full-width row under the other columns. */
  wrap?: boolean
  header?: ReactNode
  children: ReactNode
  label?: string
}

export function Column({ width = 'fill', divider = true, wrap = false, header, children, label }: ColumnProps) {
  return (
    <section
      className={cx(styles.column, styles[width], divider && styles.divider, wrap && styles.wrap)}
      aria-label={label}
    >
      {header}
      <div className={styles.body}>{children}</div>
    </section>
  )
}
