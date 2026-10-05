// LegendItem: a chart legend entry, a small swatch and its label ("▢ 20 °C").
// The chart passes its own swatch so legend and marks share one style.
import type { ReactNode } from 'react'
import styles from './LegendItem.module.css'

interface LegendItemProps {
  swatch: ReactNode
  children: ReactNode
}

export function LegendItem({ swatch, children }: LegendItemProps) {
  return (
    <span className={styles.item}>
      {swatch}
      {children}
    </span>
  )
}
