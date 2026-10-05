// Slider: a range input with the accent track filled up to the thumb and
// optional tick labels underneath (the nominal-size slider).
import type { CSSProperties } from 'react'
import styles from './Slider.module.css'

export interface SliderTick {
  label: string
  /** Position along the track, 0 … 100 %. */
  percent: number
}

interface SliderProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** Accessible name. */
  label: string
  /** Text read out for the current value, e.g. "25 mm". */
  valueText?: string
  ticks?: readonly SliderTick[]
}

export function Slider({ value, min, max, onChange, label, valueText, ticks }: SliderProps) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className={styles.slider}>
      <input
        type="range"
        className={styles.input}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        min={min}
        max={max}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
      />
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
