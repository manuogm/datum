// The small readouts of the contributor editor: what a row adds to the stack
// as it is typed ("mean 0.960 · ±0.035"), how a geometric band is built
// ("zone 0.100 + bonus 0.200 + datum B shift 0.050"), and what a modifier
// sub-panel works out ("MMC Ø10.000 → bonus up to 0.200"). The numbers come
// from the engine; this file only words them.
import type { UnitSystem } from '../../../../core/units'
import {
  analyseStack, plusShare,
  type ContributorResult, type DrawingStandard, type GeometricBreakdown, type MaterialBoundary, type MaterialCondition,
} from '../../calc'
import type { DatumCell, FeatureSize, GeometricEntry, StackInputs } from '../state/stackInputs'
import { engineInput, type LinkValues } from './engineInput'
import { DIAMETER, len, plusMinus, signed } from './format'

/**
 * What one row adds to the stack, worked out by the engine on that row alone:
 * so a row can show its band while another row is still being typed. null
 * while the row itself is not complete.
 */
export function rowResult(inputs: StackInputs, links: ReadonlyMap<string, LinkValues>, index: number): ContributorResult | null {
  const row = inputs.rows[index]
  if (!row) return null
  const alone = engineInput({ ...inputs, rows: [row], requirement: { min: null, max: null } }, links)
  const analysis = analyseStack(alone)
  return analysis.ok ? analysis.value.contributors[0] : null
}

/** "mean 0.960 · ±0.035": the row centred, for the deviations and limits readouts. */
export const meanReadout = (system: UnitSystem, row: Pick<ContributorResult, 'mean' | 'halfBand'>): string =>
  `mean ${len(system, row.mean)} · ${plusMinus(system, row.halfBand)}`

/** The datum letters at MMB / LMB, in frame order, with the shift each one adds. */
function datumShifts(entry: GeometricEntry): { letter: string; shift: number }[] {
  return entry.datums.flatMap((datum) => {
    const shift = datumShiftOf(datum)
    return datum.letter.trim() && shift !== null && shift > 0 ? [{ letter: datum.letter.trim(), shift }] : []
  })
}

/** The largest shift of one datum feature at MMB / LMB: its size tolerance plus its own tolerance at MMC; null while incomplete. */
export function datumShiftOf(datum: DatumCell): number | null {
  if (datum.modifier === 'rmb' || datum.feature.min === null || datum.feature.max === null) return null
  return datum.feature.max - datum.feature.min + (datum.boundaryAllowance ?? 0)
}

/**
 * "zone 0.100 + bonus 0.200 + datum B shift 0.050": the terms of the band
 * that are not zero. One datum shift is named by its letter; several are
 * summed as "datum shift".
 */
export function breakdownTerms(system: UnitSystem, entry: GeometricEntry, breakdown: GeometricBreakdown): string {
  const terms = [`zone ${len(system, breakdown.zone)}`]
  if (breakdown.bonus > 0) terms.push(`bonus ${len(system, breakdown.bonus)}`)
  if (breakdown.datumShift > 0) {
    const shifts = datumShifts(entry)
    terms.push(shifts.length === 1 ? `datum ${shifts[0].letter} shift ${len(system, breakdown.datumShift)}` : `datum shift ${len(system, breakdown.datumShift)}`)
  }
  return terms.join(' + ')
}

/** The bonus or a datum shift widens the band: the "= ±" cell is underlined and explains why. */
export const widened = (breakdown: GeometricBreakdown | null): boolean => breakdown !== null && (breakdown.bonus > 0 || breakdown.datumShift > 0)

/**
 * The size the bonus or the shift is measured from: the maximum material
 * size (the smallest hole, the largest pin) or the least material size.
 */
function boundarySize(feature: FeatureSize, condition: 'mmc' | 'lmc'): number | null {
  const smallest = condition === 'mmc' ? feature.type === 'internal' : feature.type === 'external'
  return smallest ? feature.min : feature.max
}

const SIZE_NAME: Record<DrawingStandard, Record<'mmc' | 'lmc', string>> = {
  iso: { mmc: 'MMS', lmc: 'LMS' },
  asme: { mmc: 'MMC', lmc: 'LMC' },
}

/** "MMC Ø10.000 → bonus up to 0.200" (ISO: MMS); null while the sizes are not entered. */
export function bonusReadout(system: UnitSystem, entry: GeometricEntry, standard: DrawingStandard): string | null {
  const condition: MaterialCondition = entry.materialCondition
  if (condition === 'rfs' || entry.feature.min === null || entry.feature.max === null) return null
  const size = boundarySize(entry.feature, condition)
  if (size === null) return null
  return `${SIZE_NAME[standard][condition]} ${DIAMETER}${len(system, size)} → bonus up to ${len(system, entry.feature.max - entry.feature.min)}`
}

/**
 * "MMB Ø12.000 → shift up to 0.050": the datum's boundary is its MMC (LMC)
 * size, moved out by its own tolerance at MMC (virtual condition).
 */
export function shiftReadout(system: UnitSystem, datum: DatumCell): string | null {
  const shift = datumShiftOf(datum)
  const condition = datum.modifier === 'mmb' ? 'mmc' : 'lmc'
  const size = boundarySize(datum.feature, condition)
  if (shift === null || size === null) return null
  const allowance = datum.boundaryAllowance ?? 0
  // A hole's MMB is smaller than its MMC size by the allowance, a pin's larger (and the other way at LMB).
  const outward = (datum.feature.type === 'external') === (condition === 'mmc') ? 1 : -1
  const boundary = size + outward * allowance
  const name: Record<Exclude<MaterialBoundary, 'rmb'>, string> = { mmb: 'MMB', lmb: 'LMB' }
  return `${name[datum.modifier as 'mmb' | 'lmb']} ${DIAMETER}${len(system, boundary)} → shift up to ${len(system, shift)}`
}

/** An ISO UZ offset v as the Ⓤ value the engine takes: zone/2 + v. */
export const unequalValueFromOffset = (zone: number, offset: number): number => zone / 2 + offset
/** The Ⓤ value as an ISO UZ offset: value − zone/2. */
export const offsetFromUnequalValue = (zone: number, value: number): number => value - zone / 2

/**
 * "profile 0.300: +0.100 / −0.200 → mean −0.050, ±0.150": an unequally
 * disposed zone as deviations on the stacked dimension (engine plusShare).
 */
export function unequalReadout(system: UnitSystem, entry: GeometricEntry): string | null {
  const { zone, unequal } = entry
  if (zone === null || unequal.value === null || unequal.value < 0 || unequal.value > zone) return null
  const plus = plusShare({ kind: 'geometric', characteristic: entry.characteristic, zone, unequal: { value: unequal.value, materialSide: unequal.materialSide } })
  const upper = plus
  const lower = plus - zone
  return `profile ${len(system, zone)}: ${signed(system, upper)} / ${signed(system, lower)} → mean ${signed(system, (upper + lower) / 2)}, ${plusMinus(system, zone / 2)}`
}

/**
 * A modifier line of the engine as ON THE STACK shows it: its first sentence,
 * without the closing citation ("Ⓕ free state: recorded; a rigid 1D stack is
 * unchanged"). The whole line, citation included, stays under the block's
 * "Sources and when to include it" and in the report.
 */
export function modifierHeadline(line: string): string {
  const first = line.split(/(?<=\.)\s+(?=\p{Lu})/u)[0].trim()
  const body = first.replace(/\.$/, '')
  if (!body.endsWith(')')) return body
  // Drop the closing parenthetical, nested parentheses and all.
  let depth = 0
  for (let i = body.length - 1; i >= 0; i--) {
    if (body[i] === ')') depth++
    else if (body[i] === '(' && --depth === 0) return body.slice(0, i).trimEnd() || body
  }
  return body
}
