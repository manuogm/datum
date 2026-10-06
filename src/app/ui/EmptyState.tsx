// EmptyState: the one way screens say "nothing here yet" (an empty folder,
// no material passes the filters).
import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'
import { cx } from './cx'

interface EmptyStateProps {
  children: ReactNode
  /** column: padded like column content; page: aligned to the page gutter; none: inside padded content. */
  inset?: 'column' | 'page' | 'none'
}

export function EmptyState({ children, inset = 'column' }: EmptyStateProps) {
  return <p className={cx(styles.empty, inset !== 'none' && styles[inset])}>{children}</p>
}
