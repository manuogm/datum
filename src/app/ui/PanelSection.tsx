// PanelSection: a block of a column with a MonoLabel heading ("APPLICATION",
// "REQUIREMENTS") and an optional note on the right of the heading.
import { useId, type ReactNode } from 'react'
import styles from './PanelSection.module.css'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'

interface PanelSectionProps {
  label?: string
  /** Small note right of the label, e.g. "◆ from project targets". */
  aside?: ReactNode
  /** Take the remaining height of the column. */
  grow?: boolean
  children: ReactNode
  className?: string
}

export function PanelSection({ label, aside, grow = false, children, className }: PanelSectionProps) {
  const labelId = useId()
  return (
    <section className={cx(styles.section, grow && styles.grow, className)} aria-labelledby={label ? labelId : undefined}>
      {(label || aside) && (
        <div className={styles.heading}>
          {label && (
            <MonoLabel as="h3" id={labelId}>
              {label}
            </MonoLabel>
          )}
          {aside && <span className={styles.aside}>{aside}</span>}
        </div>
      )}
      {children}
    </section>
  )
}
