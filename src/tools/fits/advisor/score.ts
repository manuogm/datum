import type { Check } from './types'

/** Sum of the points deducted by a candidate's checks (unrounded, may exceed 100). */
export function totalPenalty(checks: readonly Check[]): number {
  return checks.reduce((sum, check) => sum + check.penalty, 0)
}

/**
 * Score 0 … 100 of a candidate fit (a Datum judgement, see rules.ts):
 *
 *   score = 100 − Σ penalty of every check, rounded, never below 0
 *
 * Each check's penalty is SCORE_POINTS × how far its requirement is missed
 * (e.g. µm outside the clearance window ÷ window width), so the score keeps
 * discriminating between fits even when none meets every requirement.
 */
export function scoreCandidate(checks: readonly Check[]): number {
  return Math.max(0, Math.round(100 - totalPenalty(checks)))
}
