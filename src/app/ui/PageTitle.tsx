// PageTitle: page heading with a mono eyebrow ("12 PROJECTS · 148
// CALCULATIONS") and optional content beside the title (a status badge).
import type { ReactNode } from 'react'
import styles from './PageTitle.module.css'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'

interface PageTitleProps {
  eyebrow?: ReactNode
  title: ReactNode
  /** md 40px (detail pages), lg 48px (section pages). */
  size?: 'md' | 'lg'
  /** Shown to the right of the title. */
  children?: ReactNode
}

export function PageTitle({ eyebrow, title, size = 'lg', children }: PageTitleProps) {
  return (
    <div className={cx(styles.title, styles[size])}>
      {eyebrow && <MonoLabel size="md">{eyebrow}</MonoLabel>}
      <div className={styles.row}>
        <h1 className={styles.heading}>{title}</h1>
        {children}
      </div>
    </div>
  )
}
