// Slider: a 4px rail with an accent fill, in three modes:
//   value    one thumb, filled up to it (the nominal-size slider)
//   atLeast  one thumb, filled from it to the end ("Service temp. ≥ 140 °C");
//            left at its minimum it filters nothing and is drawn muted
//   range    two thumbs, filled between them (a min–max window)
// An optional label and value sit above the rail, optional tick labels below.
// Native range inputs are stacked on the rail so each thumb stays keyboard
// accessible.
import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx'
import styles from './Slider.module.css'

export interface SliderTick {
  label: string
  /** Position along the rail, 0 … 100 %. */
  percent: number
}

type SliderValue =
  | { mode?: 'value' | 'atLeast'; value: number; onChange: (value: number) => void }
  | { mode: 'range'; value: readonly [number, number]; onChange: (value: [number, number]) => void }

type SliderProps = SliderValue & {
  /** Plain-text name for screen readers, e.g. "Minimum service temperature". */
  name: string
  /** Shown above the rail with valueText; may hold markup such as a subscript. */
  label?: ReactNode
  /** The current value as read, e.g. "140 °C" or "1.0 – 9.0 g/cm³". */
  valueText?: string
  min: number
  max: number
  step?: number
  ticks?: readonly SliderTick[]
}

const THUMB_NAMES = ['minimum', 'maximum']

export function Slider(props: SliderProps) {
  const { name, label, valueText, min, max, step = 1, ticks } = props
  const mode = props.mode ?? 'value'
  const values: readonly number[] = props.mode === 'range' ? props.value : [props.value]
  const percent = (value: number) => ((value - min) / (max - min)) * 100
  const [from, to] = mode === 'value' ? [min, values[0]] : [values[0], values[1] ?? max]
  const idle = mode === 'atLeast' && values[0] <= min
  const fill = { '--from': `${percent(from)}%`, '--to': `${percent(to)}%` } as CSSProperties

  const change = (index: number, value: number) => {
    if (props.mode !== 'range') return props.onChange(value)
    const next: [number, number] = [...props.value]
    next[index] = value
    // Dragging one thumb past the other pushes it along.
    if (next[0] > next[1]) next[1 - index] = value
    props.onChange(next)
  }

  return (
    <div className={styles.slider}>
      {label && (
        <div className={styles.head}>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>{valueText}</span>
        </div>
      )}
      <div className={cx(styles.rail, idle && styles.idle)} style={fill}>
        {values.map((value, index) => (
          <input
            key={THUMB_NAMES[index]}
            type="range"
            className={styles.input}
            min={min}
            max={max}
            step={step}
            value={value}
            aria-label={mode === 'range' ? `${name}, ${THUMB_NAMES[index]}` : name}
            aria-valuetext={valueText}
            onChange={(event) => change(index, Number(event.target.value))}
          />
        ))}
      </div>
      {ticks && (
        <div className={styles.ticks} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick.label} className={styles.tick} style={{ left: `${tick.percent}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
