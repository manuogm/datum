// Switch: on/off option with a label (e.g. a tool option).
import type { ReactNode } from 'react'
import styles from './Switch.module.css'
import { cx } from './cx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}

export function Switch({ checked, onChange, children }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cx(styles.switch, checked && styles.on)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
      {children}
    </button>
  )
}
