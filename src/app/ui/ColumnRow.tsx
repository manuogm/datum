// ColumnRow: lays out a screen's Columns side by side at full height, and
// lets them wrap and stack on narrower screens (see Column).
import type { ReactNode } from 'react'
import styles from './ColumnRow.module.css'

export function ColumnRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}
