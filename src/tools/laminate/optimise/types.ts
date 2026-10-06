import type { FailureCriterion, LaminateLoads, PlyMaterial } from '../calc'
import type { DesignRule } from './rules'

export interface OptimiseInput {
  /** One ply material for the whole laminate, so mass and thickness are both proportional to the ply count. */
  readonly material: PlyMaterial
  readonly loads: LaminateLoads
  readonly criterion: FailureCriterion
  /** The angles the laminate may use; omitted: DEFAULT_ANGLES_DEG. Must contain −θ for every θ other than 0° and 90°. */
  readonly anglesDeg?: readonly number[]
  /** Omitted: the analysis default (the project's composite minimum reserve factor). */
  readonly targetReserveFactor?: number
  readonly tsaiWuF12Star?: number
  /** Largest laminate to search, an even number of plies; omitted: DEFAULT_MAX_PLIES. */
  readonly maxPlies?: number
}

export interface LayupCandidate {
  /** The full stack, top ply first. */
  readonly anglesDeg: readonly number[]
  readonly notation: string
  readonly plyCount: number
  readonly thicknessMm: number
  readonly arealMassKgPerM2: number
  readonly reserveFactor: number
  readonly criticalPlies: readonly number[]
}

export interface SearchSummary {
  /** Smallest and largest ply count analysed. The largest can be below maxPlies: the search stops at the first count that reaches the target, and the rules can rule out larger counts. */
  readonly plyCounts: readonly [number, number]
  /** The largest laminate the search was allowed to build (the input, or DEFAULT_MAX_PLIES). */
  readonly maxPlies: number
  readonly sequencesAnalysed: number
  /** False when some rule-compliant sequences were not analysed (the MAX_SEQUENCES_PER_PLY_COUNT cap): `best` is then the best found. */
  readonly exhaustive: boolean
  /** True when moments are applied: the stacking order then changes the ply stresses, so sequences are compared, not only ply mixes. */
  readonly orderMatters: boolean
}

export interface LayupOptimisation {
  /** The fewest plies that reach the target under the rules, and among those the highest reserve factor; null when none up to maxPlies does. */
  readonly best: LayupCandidate | null
  /** Up to 10 alternatives, highest reserve factor first, at the ply count of `best` (or the largest ply count searched when there is no best). */
  readonly candidates: readonly LayupCandidate[]
  readonly targetReserveFactor: number
  readonly rules: readonly DesignRule[]
  readonly search: SearchSummary
}
