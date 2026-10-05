// InputWell: the small boxed mono well of the requirement rows
// ("−20 … 140 °C"). Holds one or more QuantityInputs and their unit.
import type { ReactNode } from 'react'
import styles from './InputWell.module.css'

interface InputWellProps {
  children: ReactNode
  unit?: string
}

export function InputWell({ children, unit }: InputWellProps) {
  return (
    <span className={styles.well}>
      {children}
      {unit && <span className={styles.unit}>{unit}</span>}
    </span>
  )
}
