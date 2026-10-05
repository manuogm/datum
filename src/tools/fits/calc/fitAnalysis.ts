import { formatFit, parseFitDesignation, type ZoneSpec } from './designation'
import { fail, ok, type Result } from './result'
import { toleranceZoneFor, type ToleranceZone } from './toleranceZone'
import { roundUm } from './units'

/**
 * ISO 286-1:2010 fit types:
 * - clearance: always a clearance (min clearance ≥ 0);
 * - interference: always an interference (max clearance ≤ 0);
 * - transition: may give either, depending on the actual sizes.
 */
export type FitType = 'clearance' | 'transition' | 'interference'

/** Clearances are hole size − shaft size: negative values are interference. */
export interface FitAnalysis {
  /** e.g. 'H7/g6' */
  readonly designation: string
  readonly nominalMm: number
  readonly hole: ToleranceZone
  readonly shaft: ToleranceZone
  /** Largest hole with smallest shaft: ES − ei. */
  readonly maxClearanceUm: number
  /** Smallest hole with largest shaft: EI − es (negative = maximum interference). */
  readonly minClearanceUm: number
  /** Mid-point of the two: (max + min) / 2. */
  readonly meanClearanceUm: number
  /** Variation of the fit: max − min clearance = IT(hole) + IT(shaft). */
  readonly fitToleranceUm: number
  readonly fitType: FitType
}

export function classifyFit(maxClearanceUm: number, minClearanceUm: number): FitType {
  if (minClearanceUm >= 0) return 'clearance'
  if (maxClearanceUm <= 0) return 'interference'
  return 'transition'
}

/** Clearance / interference figures of a hole class with a shaft class at one nominal size. */
export function analyseFit(hole: ZoneSpec, shaft: ZoneSpec, nominalMm: number): Result<FitAnalysis> {
  if (hole.kind !== 'hole' || shaft.kind !== 'shaft') {
    return fail('A fit needs a hole class (upper case, e.g. H7) and a shaft class (lower case, e.g. g6).')
  }
  const holeZone = toleranceZoneFor(hole, nominalMm)
  const shaftZone = toleranceZoneFor(shaft, nominalMm)
  if (!holeZone.ok) return holeZone
  if (!shaftZone.ok) return shaftZone

  const maxClearanceUm = roundUm(holeZone.value.upperDeviationUm - shaftZone.value.lowerDeviationUm)
  const minClearanceUm = roundUm(holeZone.value.lowerDeviationUm - shaftZone.value.upperDeviationUm)
  return ok({
    designation: formatFit({ hole, shaft }),
    nominalMm,
    hole: holeZone.value,
    shaft: shaftZone.value,
    maxClearanceUm,
    minClearanceUm,
    meanClearanceUm: roundUm((maxClearanceUm + minClearanceUm) / 2),
    fitToleranceUm: roundUm(maxClearanceUm - minClearanceUm),
    fitType: classifyFit(maxClearanceUm, minClearanceUm),
  })
}

/** Convenience: analyseFit from a designation string, e.g. analyseFitDesignation('H7/g6', 25). */
export function analyseFitDesignation(designation: string, nominalMm: number): Result<FitAnalysis> {
  const fit = parseFitDesignation(designation)
  return fit.ok ? analyseFit(fit.value.hole, fit.value.shaft, nominalMm) : fit
}
