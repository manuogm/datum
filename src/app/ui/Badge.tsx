// Badge: soft status pill (PASS / REVIEW), outlined emphasis (INTERFERENCE)
// or a neutral reference tag (ISO 286-1 · 286-2, REV C).
import type { ReactNode } from 'react'
import styles from './Badge.module.css'
import { cx } from './cx'
import type { Tone } from './tone'

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  variant?: 'soft' | 'outlined' | 'reference'
  /** Padding step: sm for inline rows, md for headers and tables. */
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, tone = 'neutral', variant = 'soft', size = 'sm', className }: BadgeProps) {
  return <span className={cx(styles.badge, styles[variant], styles[size], styles[tone], className)}>{children}</span>
}
