// A modifier of a feature control frame, drawn: a letter in a 1 px circle
// (Ⓜ Ⓛ Ⓟ Ⓤ Ⓕ Ⓣ), "ST" in an elongated hexagon (⟨ST⟩), or plain letters
// (CZ, UZ). Not the Unicode circled letters: the mono font has none, and the
// fallback fonts draw them at different sizes (design §4.2). The Unicode form
// is the accessible name.
import { cx } from '../../../../app/ui'
import styles from './gdt.module.css'

export type ModifierSymbol = 'M' | 'L' | 'P' | 'U' | 'F' | 'T' | 'ST' | 'CZ' | 'UZ'

const TEXT: Record<ModifierSymbol, string> = { M: 'Ⓜ', L: 'Ⓛ', P: 'Ⓟ', U: 'Ⓤ', F: 'Ⓕ', T: 'Ⓣ', ST: '⟨ST⟩', CZ: 'CZ', UZ: 'UZ' }

export function GdtModifier({ symbol, className }: { symbol: ModifierSymbol; className?: string }) {
  if (symbol === 'CZ' || symbol === 'UZ') return <span className={cx(styles.plainModifier, className)}>{symbol}</span>
  if (symbol === 'ST') {
    return (
      <span className={cx(styles.statistical, className)} role="img" aria-label={TEXT.ST}>
        <svg viewBox="0 0 26 14" aria-hidden="true" focusable="false">
          <path d="M1 7L5 1H21L25 7L21 13H5Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span aria-hidden="true">ST</span>
      </span>
    )
  }
  return (
    <span className={cx(styles.circled, className)} role="img" aria-label={TEXT[symbol]}>
      <span aria-hidden="true">{symbol}</span>
    </span>
  )
}
