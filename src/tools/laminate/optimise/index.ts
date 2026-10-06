/**
 * Composite laminate stacking-sequence optimiser: public API.
 *
 * optimiseLayup enumerates the symmetric, balanced laminates of one ply
 * material that meet the design rules in rules.ts, analyses each with the
 * laminate engine (../calc), and returns the one with the fewest plies (so
 * least mass and thickness) that reaches the target reserve factor.
 * Deterministic; never throws on user input, returns Result values.
 */
export { optimiseLayup } from './optimiseLayup'
export {
  DEFAULT_ANGLES_DEG, DEFAULT_MAX_PLIES, DESIGN_RULES, MAX_CONSECUTIVE_PLIES, MAX_SEQUENCES_PER_PLY_COUNT, MIN_SHARE_PERCENT,
  type DesignRule,
} from './rules'
export type { LayupCandidate, LayupOptimisation, OptimiseInput, SearchSummary } from './types'
