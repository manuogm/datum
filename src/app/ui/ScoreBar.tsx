// ScoreBar: thin horizontal bar for scores and utilisation (0–100 %).
import styles from './ScoreBar.module.css'
import { cx } from './cx'
import type { Tone } from './tone'

interface ScoreBarProps {
  /** Percentage, clamped to 0–100. */
  value: number
  tone?: Tone
  /** fill = full width of its cell, compact = 30px (dense tables). */
  width?: 'fill' | 'compact'
  label: string
}

export function ScoreBar({ value, tone = 'accent', width = 'fill', label }: ScoreBarProps) {
  const percent = Math.min(100, Math.max(0, value))
  return (
    <div
      className={cx(styles.track, width === 'compact' && styles.compact)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div className={cx(styles.fill, styles[tone])} style={{ width: `${percent}%` }} />
    </div>
  )
}
