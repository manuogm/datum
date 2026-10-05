// Rationale: the strip under a chart that explains the result in words, led
// by an accent mono label ("WHY  The aluminium housing grows …").
import type { ReactNode } from 'react'
import styles from './Rationale.module.css'
import { MonoLabel } from './MonoLabel'

interface RationaleProps {
  label?: string
  children: ReactNode
}

export function Rationale({ label = 'Why', children }: RationaleProps) {
  return (
    <div className={styles.strip}>
      <MonoLabel tone="accent" className={styles.label}>
        {label}
      </MonoLabel>
      <div className={styles.text}>{children}</div>
    </div>
  )
}
