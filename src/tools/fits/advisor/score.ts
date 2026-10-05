import { SCORE_PENALTY } from './rules'
import type { Check } from './types'

/**
 * Score 0 … 100 of a candidate fit (a Datum judgement, see rules.ts):
 *
 *   score = 100 × windowShare − Σ penalty(status of every other check)
 *
 * windowShare is the share of the in-service clearance range (all part sizes
 * within tolerance, all temperatures in the service range) that lies inside
 * the required clearance window: 1 when it is fully inside. Each other check
 * costs SCORE_PENALTY points for a warning or a failure. The result is
 * rounded to a whole number and never below 0.
 */
export function scoreCandidate(windowShare: number, checks: readonly Check[]): number {
  const penalty = checks
    .filter((check) => check.id !== 'service-window')
    .reduce((sum, check) => sum + SCORE_PENALTY[check.status], 0)
  return Math.max(0, Math.round(100 * windowShare - penalty))
}
