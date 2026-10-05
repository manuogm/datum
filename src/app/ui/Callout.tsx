// Callout: the verdict box at the top of a results column ("Pass at 20 °C",
// "Governing: B4 · M4 Keensert").
import type { ReactNode } from 'react'
import styles from './Callout.module.css'
import { cx } from './cx'
import { StatusIcon, type Status } from './StatusIcon'

interface CalloutProps {
  status: Status
  title: ReactNode
  children?: ReactNode
}

export function Callout({ status, title, children }: CalloutProps) {
  return (
    <div className={cx(styles.callout, styles[status])} role="status">
      <StatusIcon status={status} size="md" />
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {children && <span className={styles.detail}>{children}</span>}
      </div>
    </div>
  )
}
