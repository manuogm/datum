// SegmentedControl: single choice between a few options (SI / Imperial,
// Fit advisor / Calculator, All / Open / In review).
import type { ReactNode } from 'react'
import styles from './SegmentedControl.module.css'
import { cx } from './cx'
import { Marker } from './Marker'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group. */
  label: string
  variant?: 'inset' | 'joined'
  /** sm = 12px (header, assembly), md = 12.5px (column mode switch). */
  size?: 'sm' | 'md'
  /** Stretch segments to share the available width. */
  fill?: boolean
  /** Show the accent diamond before the selected label. */
  markSelected?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = 'inset',
  size = 'sm',
  fill = false,
  markSelected = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cx(styles.group, styles[variant], styles[size], fill && styles.fill, className)}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={cx(styles.segment, selected && styles.selected)}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {selected && markSelected && <Marker shape="diamond" size={6} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
