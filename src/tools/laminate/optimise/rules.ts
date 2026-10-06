/**
 * Stacking-sequence design rules the optimiser enforces, as commonly applied
 * in aerospace laminate design (Niu, Composite Airframe Structures (1992)
 * §5.3; MIL-HDBK-17-3F (2002) §5.5 laminate design guidelines; Kassapoglou,
 * Design and Analysis of Composite Structures, 2nd ed. (2013) §2.3).
 * UNSURE: the 10 % share and the 4-ply run limit are the usual industry
 * values, not requirements of one standard; programmes set their own.
 */

/** Ply angles used when none are given: the four standard directions. */
export const DEFAULT_ANGLES_DEG: readonly number[] = [0, 45, -45, 90]

/** Smallest share of the plies in each angle of the set, percent. */
export const MIN_SHARE_PERCENT = 10

/** Most plies of the same angle stacked next to each other (fewer large matrix cracks, less interlaminar stress). */
export const MAX_CONSECUTIVE_PLIES = 4

/** Largest laminate searched when none is given: 48 plies (6 mm of 0.125 mm plies). */
export const DEFAULT_MAX_PLIES = 48

/**
 * Most stacking sequences analysed per ply count when moments are applied
 * (the order then matters), shared equally among the ply mixes; each mix
 * takes its orders in enumeration order. Beyond it the search reports that
 * it was not exhaustive. Without moments one sequence per ply mix is enough.
 */
export const MAX_SEQUENCES_PER_PLY_COUNT = 2000

export interface DesignRule {
  readonly id: 'symmetric' | 'balanced' | 'min-share' | 'max-consecutive' | 'outer-plies'
  readonly description: string
}

export const DESIGN_RULES: readonly DesignRule[] = [
  { id: 'symmetric', description: 'Symmetric about the mid-plane (B = 0: no warping on cure, no bending under in-plane load). Even ply counts only.' },
  { id: 'balanced', description: 'Balanced: as many −θ plies as +θ plies for every angle other than 0° and 90° (A16 = A26 = 0).' },
  { id: 'min-share', description: `At least ${MIN_SHARE_PERCENT} % of the plies in each angle of the set, so the laminate tolerates loads not foreseen.` },
  { id: 'max-consecutive', description: `No more than ${MAX_CONSECUTIVE_PLIES} plies of the same angle in a row, counted through the mid-plane.` },
  { id: 'outer-plies', description: 'The outer plies are ±45° (when ±45° is in the set), for impact and buckling resistance and to protect the load-carrying 0° plies.' },
]
