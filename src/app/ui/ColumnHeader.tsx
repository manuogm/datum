// ColumnHeader: the 52px bar with a column title, optional mono meta text and
// right-aligned actions. Pass children instead to fill the bar freely (e.g. a
// mode SegmentedControl).
import type { ReactNode } from 'react'
import styles from './ColumnHeader.module.css'

interface ColumnHeaderProps {
  title?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export function ColumnHeader({ title, meta, actions, children }: ColumnHeaderProps) {
  return (
    <div className={styles.bar}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {meta && <span className={styles.meta}>{meta}</span>}
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
