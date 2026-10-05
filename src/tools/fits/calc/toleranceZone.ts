import { formatZone, zoneSpec, type ZoneSpec } from './designation'
import type { FundamentalDeviation } from './fundamentalDeviation'
import { holeFundamentalDeviation } from './holeDeviations'
import type { ZoneKind } from './letters'
import { ok, type Result } from './result'
import { shaftFundamentalDeviation } from './shaftDeviations'
import { checkNominalSize } from './sizeTable'
import { standardToleranceUm } from './toleranceGrades'
import { addDeviationToSizeMm, roundUm } from './units'

/** A tolerance class applied to a nominal size: its limit deviations and limits of size. */
export interface ToleranceZone extends ZoneSpec {
  /** e.g. 'H7' */
  readonly designation: string
  readonly nominalMm: number
  /** Standard tolerance IT of the grade at this size (ISO 286-1 Table 1). */
  readonly itUm: number
  /**
   * The limit deviation closest to the zero line (ISO 286-1 definition of fundamental deviation).
   * For js/JS, which is symmetric, this is the upper deviation +IT/2.
   */
  readonly fundamentalDeviationUm: number
  /** es for shafts, ES for holes. */
  readonly upperDeviationUm: number
  /** ei for shafts, EI for holes. */
  readonly lowerDeviationUm: number
  readonly maxSizeMm: number
  readonly minSizeMm: number
}

/**
 * Limit deviations and sizes of a tolerance class at a nominal size, e.g.
 * toleranceZone('hole', 'H', 7, 25) → +21 / 0 µm.
 * Returns an explanation instead of a zone when ISO 286 does not define the combination.
 */
export function toleranceZone(kind: ZoneKind, letter: string, grade: string | number, nominalMm: number): Result<ToleranceZone> {
  const spec = zoneSpec(kind, letter, grade)
  return spec.ok ? toleranceZoneFor(spec.value, nominalMm) : spec
}

/** Same as toleranceZone, for an already parsed class (see parseZone). */
export function toleranceZoneFor(spec: ZoneSpec, nominalMm: number): Result<ToleranceZone> {
  const size = checkNominalSize(nominalMm)
  if (!size.ok) return size
  const it = standardToleranceUm(spec.grade, nominalMm)
  if (!it.ok) return it
  const fundamental = fundamentalDeviation(spec, it.value, nominalMm)
  if (!fundamental.ok) return fundamental

  const { limit, valueUm } = fundamental.value
  const upperDeviationUm = roundUm(limit === 'upper' ? valueUm : valueUm + it.value)
  const lowerDeviationUm = roundUm(limit === 'lower' ? valueUm : valueUm - it.value)
  return ok({
    ...spec,
    designation: formatZone(spec),
    nominalMm,
    itUm: it.value,
    fundamentalDeviationUm: valueUm,
    upperDeviationUm,
    lowerDeviationUm,
    maxSizeMm: addDeviationToSizeMm(nominalMm, upperDeviationUm),
    minSizeMm: addDeviationToSizeMm(nominalMm, lowerDeviationUm),
  })
}

function fundamentalDeviation(spec: ZoneSpec, itUm: number, nominalMm: number): Result<FundamentalDeviation> {
  const { kind, letter, grade } = spec
  if (letter === 'js') return ok(symmetricDeviation(itUm))
  return kind === 'hole'
    ? holeFundamentalDeviation(letter, grade, nominalMm)
    : shaftFundamentalDeviation(letter, grade, nominalMm)
}

/**
 * js / JS: limit deviations ±IT/2 (ISO 286-1:2010, symmetric deviation js/JS).
 * The exact half value is used (e.g. js7 at 25 mm = ±10.5 µm). The standard
 * allows rounding odd IT values down to an even number for js7 to js11; that
 * optional rounding is not applied here.
 */
function symmetricDeviation(itUm: number): FundamentalDeviation {
  return { limit: 'upper', valueUm: roundUm(itUm / 2) }
}
