// Checkbox: labelled accent checkbox (data source filters, "Record as design
// decision").
import type { ReactNode } from 'react'
import styles from './Checkbox.module.css'
import { cx } from './cx'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  /** sm 14px box (filter lists), md 18px box (dialog options). */
  size?: 'sm' | 'md'
}

export function Checkbox({ checked, onChange, children, size = 'sm' }: CheckboxProps) {
  return (
    <label className={cx(styles.checkbox, styles[size], checked && styles.checked)}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        {checked && '✓'}
      </span>
      {children}
    </label>
  )
}
