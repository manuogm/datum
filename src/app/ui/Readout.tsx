// Readout: a MonoLabel over a large value with its unit (MAX UTILISATION 0.91,
// MIN CLEARANCE 7 µm, or the 64px fit designation H7/p6).
import type { ReactNode } from 'react'
import styles from './Readout.module.css'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'

interface ReadoutProps {
  label?: string
  value: ReactNode
  unit?: string
  /** sm 26px, md 56px, lg 64px. */
  size?: 'sm' | 'md' | 'lg'
  /** mono for numbers, sans for designations like H7/p6. */
  font?: 'mono' | 'sans'
  tone?: 'default' | 'ok' | 'warn' | 'bad'
}

export function Readout({ label, value, unit, size = 'md', font = 'mono', tone = 'default' }: ReadoutProps) {
  return (
    <div className={cx(styles.readout, styles[size])}>
      {label && <MonoLabel>{label}</MonoLabel>}
      <span className={cx(styles.value, styles[font], styles[tone])}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
    </div>
  )
}
