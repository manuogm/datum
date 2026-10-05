// Which of the advisor's candidates the chart shows, in what order, and the
// colour a score is drawn in.
import type { FitCandidate } from '../../advisor'
import type { Status } from '../../../../app/ui'

/** Columns in the "Fit candidates" chart; the ranked list shows them all. */
export const CHARTED_CANDIDATES = 6

/**
 * The best-ranked candidates, plus the compared one when it ranks lower,
 * ordered loosest fit first (largest mean clearance at 20 °C on the left).
 */
export function chartedCandidates(ranked: readonly FitCandidate[], comparedDesignation: string | null): readonly FitCandidate[] {
  const shown = ranked.slice(0, CHARTED_CANDIDATES)
  const compared = ranked.find((c) => c.fit.designation === comparedDesignation)
  if (compared && !shown.includes(compared)) shown.push(compared)
  return shown.sort((a, b) => b.fit.meanClearanceUm - a.fit.meanClearanceUm)
}

/** Score colour: green from 90, amber from 70, red below. */
export function scoreTone(score: number): Status {
  if (score >= 90) return 'ok'
  return score >= 70 ? 'warn' : 'bad'
}
