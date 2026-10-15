// How the stack-up screens and the report write lengths, tolerances, shares
// and the like. Lengths are stored in mm and shown in the viewer's length
// unit (mm with 3 decimals, or inches).
import { formatDecimal, formatQuantity, toDisplay, unitOf, type UnitSystem } from '../../../../core/units'
import { GEOMETRIC_RULES, type StackMethod } from '../../calc'
import type { GeometricEntry, StackInputs, ToleranceEntry } from '../state/stackInputs'

export const lengthUnit = (system: UnitSystem): string => unitOf('length', system)

/** A length, e.g. "20.925". */
export const len = (system: UnitSystem, mm: number): string => formatQuantity('length', system, mm)

/** A signed length, e.g. "+0.170", "−0.100", "0". */
export function signed(system: UnitSystem, mm: number): string {
  const text = formatQuantity('length', system, mm, { signed: true })
  return /^[0.]+$/.test(text) ? '0' : text
}

/** "20.825 … 21.095". */
export const range = (system: UnitSystem, min: number, max: number): string => `${len(system, min)} … ${len(system, max)}`

/** "±0.050". */
export const plusMinus = (system: UnitSystem, halfBand: number): string => `±${len(system, halfBand)}`

/** Deviations from nominal, e.g. "+0.170/−0.100", "0/−0.120". */
export const deviations = (system: UnitSystem, upper: number, lower: number): string => `${signed(system, upper)}/${signed(system, lower)}`

/** A share, e.g. "37.0 %". */
export const percent = (value: number, decimals = 1): string => `${formatDecimal(value, decimals, true)} %`

/** A plain number to a few significant digits: 1.77, 0.0263 (trailing zeros dropped unless kept). */
export function significant(value: number, digits = 3, keepZeros = false): string {
  if (value === 0 || !Number.isFinite(value)) return formatDecimal(value, 0)
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(value))))
  return formatDecimal(value, decimals, keepZeros)
}

/** A capability index, e.g. "1.77". */
export const index = (value: number): string => formatDecimal(value, 2, true)

/** A fraction of builds out of spec: "under 0.001 %", "0.27 %", "1.3 %". */
export function outOfSpec(fraction: number): string {
  const inPercent = 100 * fraction
  if (inPercent < 0.001) return 'under 0.001 %'
  return `${significant(inPercent, 2)} %`
}

/** σ in the length unit, to 3 significant digits, trailing zeros kept so a column lines up ("0.0263", "0.0500"). */
export const sigma = (system: UnitSystem, mm: number): string => significant(toDisplay('length', system, mm), 3, true)

export const METHOD_NAME: Record<StackMethod, string> = { 'worst-case': 'Worst case', rss: 'RSS' }

/** The requirement as a target: "20.800 … 21.100", "≥ 20.800", "≤ 21.100" or "none set". */
export function requirementText(system: UnitSystem, requirement: StackInputs['requirement']): string {
  const { min, max } = requirement
  if (min !== null && max !== null) return range(system, min, max)
  if (min !== null) return `≥ ${len(system, min)}`
  if (max !== null) return `≤ ${len(system, max)}`
  return 'none set'
}

/**
 * The direction cell: "+", "−", "+½", "−½", or "×0.87" for any other
 * coefficient (a 2D/3D stack later). The arrow is drawn beside it.
 */
export function coefficientText(sensitivity: number): string {
  const sign = sensitivity < 0 ? '−' : '+'
  const size = Math.abs(sensitivity)
  if (size === 1) return sign
  if (size === 0.5) return `${sign}½`
  return `×${formatDecimal(sensitivity, 3)}`
}

/** The ⌀ sign before a cylindrical zone. */
export const DIAMETER = 'Ø'

/** The frame's tolerance cell as text, e.g. "Ø0.100 Ⓜ"; for plain-text uses (the drawn frame is FeatureControlFrame). */
export function frameToleranceText(system: UnitSystem, entry: GeometricEntry, statistical = false): string {
  const parts = [`${entry.diameterZone && GEOMETRIC_RULES[entry.characteristic].diameterZone ? DIAMETER : ''}${entry.zone === null ? '—' : len(system, entry.zone)}`]
  if (entry.materialCondition === 'mmc') parts.push('Ⓜ')
  if (entry.materialCondition === 'lmc') parts.push('Ⓛ')
  if (entry.projected.on && entry.projected.height !== null) parts.push(`Ⓟ ${len(system, entry.projected.height)}`)
  if (entry.unequal.on && entry.unequal.value !== null) parts.push(`Ⓤ ${len(system, entry.unequal.value)}`)
  if (entry.freeState) parts.push('Ⓕ')
  if (entry.tangentPlane) parts.push('Ⓣ')
  if (entry.commonZone) parts.push('CZ')
  if (statistical) parts.push('⟨ST⟩')
  return parts.join(' ')
}

/** A tolerance as entered, in plain text: "±0.050", "+0.070/0", "20.900 … 21.000", "⌖ 0.100 | A". */
export function toleranceText(system: UnitSystem, tolerance: ToleranceEntry, statistical = false): string {
  const dash = (value: number | null) => (value === null ? '—' : len(system, value))
  const st = statistical ? ' ⟨ST⟩' : ''
  switch (tolerance.kind) {
    case 'symmetric':
      return `±${dash(tolerance.plusMinus)}${st}`
    case 'deviations':
      return `${tolerance.upper === null ? '—' : signed(system, tolerance.upper)}/${tolerance.lower === null ? '—' : signed(system, tolerance.lower)}${st}`
    case 'limits':
      return `${dash(tolerance.min)} … ${dash(tolerance.max)}${st}`
    case 'geometric': {
      const datums = tolerance.datums.filter((d) => d.letter.trim()).map((d) => `${d.letter.trim()}${d.modifier === 'mmb' ? ' Ⓜ' : d.modifier === 'lmb' ? ' Ⓛ' : ''}`)
      return [GEOMETRIC_RULES[tolerance.characteristic].symbol, frameToleranceText(system, tolerance, statistical), ...datums].join(' | ')
    }
  }
}
