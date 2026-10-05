// StatusIcon: round pass / warning / fail icon (✓, !, ×).
import styles from './StatusIcon.module.css'
import { cx } from './cx'

export type Status = 'ok' | 'warn' | 'bad'

const GLYPHS: Record<Status, { glyph: string; label: string }> = {
  ok: { glyph: '✓', label: 'Pass' },
  warn: { glyph: '!', label: 'Warning' },
  bad: { glyph: '×', label: 'Fail' },
}

interface StatusIconProps {
  status: Status
  /** sm 18px (check rows), md 24px (alerts), lg 28px (verdicts). */
  size?: 'sm' | 'md' | 'lg'
}

export function StatusIcon({ status, size = 'sm' }: StatusIconProps) {
  const { glyph, label } = GLYPHS[status]
  return (
    <span className={cx(styles.icon, styles[status], styles[size])} role="img" aria-label={label}>
      {glyph}
    </span>
  )
}
