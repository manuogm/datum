// ResultRow: one result in a results column ("Hole limits 25.000 → 25.021 mm",
// "Max clearance 41 µm"). With children it expands, like a disclosure, to
// show how the value was worked out.
import type { ReactNode } from 'react'
import styles from './ResultRow.module.css'
import { cx } from './cx'
import { Icon } from './Icon'
import { Marker } from './Marker'
import type { MarkerColor } from './tone'

interface ResultRowProps {
  label: ReactNode
  value: ReactNode
  unit?: string
  /** stacked: value on its own line under the label; inline: value right of the label. */
  layout?: 'stacked' | 'inline'
  /** Swatch before the label, e.g. hole blue. */
  marker?: { color: MarkerColor; shape?: 'square' | 'dot' }
  /** Small text under the row. */
  note?: ReactNode
  /** Details shown when the row is expanded. */
  children?: ReactNode
  defaultOpen?: boolean
}

export function ResultRow({ label, value, unit, layout = 'inline', marker, note, children, defaultOpen = false }: ResultRowProps) {
  const head = (
    <>
      <span className={styles.labelLine}>
        {marker && <Marker shape={marker.shape ?? 'square'} color={marker.color} size={8} />}
        <span className={styles.label}>{label}</span>
        {layout === 'stacked' && children && <Icon name="chevron-right" className={styles.chevron} />}
      </span>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {layout === 'inline' && children && <Icon name="chevron-right" className={styles.chevron} />}
    </>
  )
  const classes = cx(styles.row, styles[layout])
  if (!children) {
    return (
      <div className={classes}>
        <div className={styles.head}>{head}</div>
        {note && <div className={styles.note}>{note}</div>}
      </div>
    )
  }
  return (
    <details className={cx(classes, styles.expandable)} open={defaultOpen}>
      <summary className={styles.head}>{head}</summary>
      {note && <div className={styles.note}>{note}</div>}
      <div className={styles.details}>{children}</div>
    </details>
  )
}
