// StatusIcon: round pass / warning / fail icon (✓, !, ×), and a neutral one
// (–) for a result that is not judged.
import styles from './StatusIcon.module.css'
import { cx } from './cx'

export type Status = 'ok' | 'warn' | 'bad'

const GLYPHS: Record<Status | 'neutral', { glyph: string; label: string }> = {
  ok: { glyph: '✓', label: 'Pass' },
  warn: { glyph: '!', label: 'Warning' },
  bad: { glyph: '×', label: 'Fail' },
  neutral: { glyph: '–', label: 'Not judged' },
}

interface StatusIconProps {
  /** neutral: not judged (no requirement). */
  status: Status | 'neutral'
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
