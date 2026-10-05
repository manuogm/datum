import type { FitBasis } from '../calc'

/**
 * The fits the advisor compares, loosest first: the ISO preferred fits plus
 * the usual H7 series (f7 … u6), each with its shaft-basis counterpart.
 * Only one basis is compared at a time, since a hole-basis fit and its
 * shaft-basis counterpart give (nearly) the same clearances.
 */
const CANDIDATE_FITS: readonly { readonly holeBasis: string; readonly shaftBasis: string }[] = [
  { holeBasis: 'H11/c11', shaftBasis: 'C11/h11' },
  { holeBasis: 'H9/d9', shaftBasis: 'D9/h9' },
  { holeBasis: 'H8/f7', shaftBasis: 'F8/h7' },
  { holeBasis: 'H7/f7', shaftBasis: 'F7/h7' },
  { holeBasis: 'H7/g6', shaftBasis: 'G7/h6' },
  { holeBasis: 'H7/h6', shaftBasis: 'H7/h6' },
  { holeBasis: 'H7/js6', shaftBasis: 'JS7/h6' },
  { holeBasis: 'H7/k6', shaftBasis: 'K7/h6' },
  { holeBasis: 'H7/m6', shaftBasis: 'M7/h6' },
  { holeBasis: 'H7/n6', shaftBasis: 'N7/h6' },
  { holeBasis: 'H7/p6', shaftBasis: 'P7/h6' },
  { holeBasis: 'H7/r6', shaftBasis: 'R7/h6' },
  { holeBasis: 'H7/s6', shaftBasis: 'S7/h6' },
  { holeBasis: 'H7/u6', shaftBasis: 'U7/h6' },
]

export function candidateDesignations(basis: FitBasis): readonly string[] {
  return CANDIDATE_FITS.map((fit) => (basis === 'hole-basis' ? fit.holeBasis : fit.shaftBasis))
}
