// A feature control frame as on the drawing, rebuilt from the row's fields
// (design §4.2):
//
//   ┌───┬──────────────┬───┬─────┐
//   │ ⌖ │ Ø0.100 Ⓜ     │ A │ B Ⓜ │
//   └───┴──────────────┴───┴─────┘
//   symbol  tolerance + modifiers  datums + their modifiers
//
// The full form previews the frame in the row's details and draws it in the
// report; the compact form (symbol │ value + material glyph, no datums) is
// the row's tolerance cell.
import { Icon, cx } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import { GEOMETRIC_RULES, isProfile } from '../../calc'
import { DIAMETER, len, toleranceText } from '../logic/format'
import { offsetFromUnequalValue } from '../logic/readouts'
import type { GeometricEntry } from '../state/stackInputs'
import { gdtIcon } from './characteristics'
import { GdtModifier, type ModifierSymbol } from './GdtModifier'
import styles from './gdt.module.css'

interface FeatureControlFrameProps {
  entry: GeometricEntry
  system: UnitSystem
  /** ISO writes an unequal profile as UZ with an offset, ASME as Ⓤ with a value. */
  standard: 'iso' | 'asme'
  /** ⟨ST⟩ on the row: drawn after the tolerance. */
  statistical?: boolean
  /** The row's tolerance cell: symbol and value with the material glyph, no datums. */
  compact?: boolean
  className?: string
}

export function FeatureControlFrame({ entry, system, standard, statistical = false, compact = false, className }: FeatureControlFrameProps) {
  const rule = GEOMETRIC_RULES[entry.characteristic]
  const material: ModifierSymbol | null = entry.materialCondition === 'mmc' ? 'M' : entry.materialCondition === 'lmc' ? 'L' : null
  const zone = entry.zone === null ? '—' : len(system, entry.zone)
  const datums = rule.datums ? entry.datums.filter((d) => d.letter.trim()) : []
  return (
    <span
      className={cx(styles.frame, compact && styles.compact, className)}
      role="img"
      aria-label={toleranceText(system, compact ? { ...entry, datums: [] } : entry, statistical)}
    >
      <span className={cx(styles.cell, styles.symbolCell)}>
        <Icon name={gdtIcon(entry.characteristic)} />
      </span>
      <span className={cx(styles.cell, styles.toleranceCell)}>
        {entry.diameterZone && rule.diameterZone && <span>{DIAMETER}</span>}
        <span>{zone}</span>
        {material && <GdtModifier symbol={material} />}
        {!compact && <FrameModifiers entry={entry} system={system} standard={standard} />}
        {statistical && <GdtModifier symbol="ST" />}
      </span>
      {!compact &&
        datums.map((datum, i) => (
          <span key={i} className={styles.cell}>
            {datum.letter.trim()}
            {rule.datumBoundary && datum.modifier !== 'rmb' && <GdtModifier symbol={datum.modifier === 'mmb' ? 'M' : 'L'} />}
          </span>
        ))}
    </span>
  )
}

/** The tolerance modifiers after Ⓜ/Ⓛ, in drawing order: Ⓟ height, Ⓤ value (ISO UZ offset), Ⓕ, Ⓣ, CZ. */
function FrameModifiers({ entry, system, standard }: { entry: GeometricEntry; system: UnitSystem; standard: 'iso' | 'asme' }) {
  const rule = GEOMETRIC_RULES[entry.characteristic]
  const { projected, unequal } = entry
  const unequalNumber = unequal.value === null ? null : standard === 'iso' && entry.zone !== null ? offsetFromUnequalValue(entry.zone, unequal.value) : unequal.value
  return (
    <>
      {projected.on && rule.projected && (
        <>
          <GdtModifier symbol="P" />
          {projected.height !== null && <span>{len(system, projected.height)}</span>}
        </>
      )}
      {unequal.on && isProfile(entry.characteristic) && (
        <>
          <GdtModifier symbol={standard === 'iso' ? 'UZ' : 'U'} />
          {unequalNumber !== null && <span>{len(system, unequalNumber)}</span>}
        </>
      )}
      {entry.freeState && <GdtModifier symbol="F" />}
      {entry.tangentPlane && <GdtModifier symbol="T" />}
      {entry.commonZone && <GdtModifier symbol="CZ" />}
    </>
  )
}
