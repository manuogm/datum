// CheckRow: one verified criterion ("In service 140 °C ✓ 2 … 36 µm").
import type { ReactNode } from 'react'
import styles from './CheckRow.module.css'
import { StatusIcon, type Status } from './StatusIcon'

interface CheckRowProps {
  status: Status
  label: ReactNode
  value?: ReactNode
}

export function CheckRow({ status, label, value }: CheckRowProps) {
  return (
    <div className={styles.row}>
      <StatusIcon status={status} />
      <span className={styles.label}>{label}</span>
      {value !== undefined && <span className={styles.value}>{value}</span>}
    </div>
  )
}
