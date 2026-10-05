// RangeSlider: a labelled slider for "at least" filters (one thumb, e.g.
// Service temp. ≥ 140 °C) or a min–max window (two thumbs, e.g. density).
// A one-thumb slider left at its minimum filters nothing and is drawn muted.
import type { CSSProperties, ReactNode } from 'react'
import styles from './RangeSlider.module.css'
import { cx } from './cx'

interface RangeSliderProps {
  /** Shown above the slider; may hold markup such as a subscript. */
  label: ReactNode
  /** Plain-text name for screen readers, e.g. "Minimum service temperature". */
  name: string
  /** The current value as read, e.g. "140 °C" or "1.0 – 9.0 g/cm³". */
  valueText: string
  min: number
  max: number
  step: number
  /** One value (lower bound) or two (lower and upper bound). */
  values: readonly number[]
  onChange: (values: number[]) => void
}

const THUMB_NAMES = [['minimum'], ['minimum', 'maximum']]

export function RangeSlider({ label, name, valueText, min, max, step, values, onChange }: RangeSliderProps) {
  const percent = (value: number) => ((value - min) / (max - min)) * 100
  const low = values[0]
  const high = values[1] ?? max
  const idle = values.length === 1 && low <= min
  const fill = { '--from': `${percent(low)}%`, '--to': `${percent(high)}%` } as CSSProperties
  return (
    <div className={styles.slider}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{valueText}</span>
      </div>
      <div className={cx(styles.rail, idle && styles.idle)} style={fill}>
        {values.map((value, i) => (
          <input
            key={THUMB_NAMES[values.length - 1][i]}
            type="range"
            className={styles.input}
            min={min}
            max={max}
            step={step}
            value={value}
            aria-label={`${name}, ${THUMB_NAMES[values.length - 1][i]}`}
            aria-valuetext={valueText}
            onChange={(event) => {
              const next = [...values]
              next[i] = Number(event.target.value)
              if (next.length === 2 && next[0] > next[1]) next[1 - i] = next[i]
              onChange(next)
            }}
          />
        ))}
      </div>
    </div>
  )
}
