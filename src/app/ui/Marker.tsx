// Marker: the status dot, legend swatch and rotated-square project diamond
// that recur across every Direction B screen.
import type { CSSProperties } from 'react'
import styles from './Marker.module.css'
import { cx } from './cx'
import { markerColor, type MarkerColor } from './tone'

interface MarkerProps {
  shape?: 'dot' | 'square' | 'diamond'
  color?: MarkerColor
  /** Edge length in px (the designs use 6, 7, 8 and 10). */
  size?: 6 | 7 | 8 | 10
  /** Accessible text when the marker carries meaning on its own. */
  label?: string
  className?: string
}

export function Marker({ shape = 'dot', color = 'accent', size = 8, label, className }: MarkerProps) {
  const style = { '--marker-size': `${size}px`, '--marker-color': markerColor(color) } as CSSProperties
  return (
    <span
      className={cx(styles.marker, styles[shape], className)}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
