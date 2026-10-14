import type { MethodRange, StackMethod, Verdict, VerdictBasis, VerdictStatus } from './types'

/**
 * The judgement calls of the stack-up engine in one place, so they can be
 * checked and tuned. "UNSURE" marks values that are a choice rather than a
 * requirement of the cited source.
 */

/** The verdict uses worst case unless the engineer picks RSS (spec: DEFAULT worst case). */
export const DEFAULT_METHOD: StackMethod = 'worst-case'

/**
 * RSS assumes every dimension is normal, centred on its mean, with its
 * tolerance band at ±3σ: σ_i = t_i / 3 (Drake ch. 9; Fortini). The RSS range
 * of the result is then mean ± 3σ, which holds 99.73 % of results.
 */
export const SIGMAS_PER_HALF_BAND = 3

/**
 * Under the RSS method, "review" means ±3σ crosses a limit but ±2σ does not:
 * at most 2.3 % of results out of spec on that side (Cpk ≥ 0.67).
 * UNSURE: 2σ is a choice for the boundary between review and fail, not a
 * figure from a standard.
 */
export const REVIEW_SIGMA_MULTIPLE = 2

/**
 * A limit met to within 1 nm counts as met: sums like 0.1 + 0.2 carry
 * floating-point round-off of about 10⁻¹⁶ mm, far below this.
 */
export const LIMIT_TOLERANCE_MM = 1e-9

/** Longest chain the engine accepts: a guard, far above any real loop. */
export const MAX_CONTRIBUTORS = 200

/**
 * The verdict for the chosen method. Worst case is the guarantee, RSS the
 * statistical estimate, and the RSS range always lies inside the WC range
 * (√Σt² ≤ Σt), so:
 *
 * Worst case:
 * - pass:   WC range inside the requirement: every combination of parts in tolerance fits.
 * - review: WC range outside, RSS (±3σ) inside: works statistically
 *           (≤ 0.27 % out) but is not guaranteed; accept with process
 *           control, or tighten the largest contributors.
 * - fail:   RSS (±3σ) outside as well.
 *
 * RSS:
 * - pass:   mean ± 3σ inside (Cpk ≥ 1).
 * - review: mean ± 3σ outside, mean ± 2σ inside (see REVIEW_SIGMA_MULTIPLE).
 * - fail:   mean ± 2σ outside.
 *
 * twoSigma is the ±2σ range checked against the same requirement.
 * governing: the limit with the smaller margin by the chosen method; 'both'
 * when the margins are equal (a centred result between two limits).
 */
export function verdictOf(method: StackMethod, worstCase: MethodRange, rss: MethodRange, twoSigma: MethodRange): Verdict | null {
  if (worstCase.withinRequirement === null) return null
  const [status, basis]: [VerdictStatus, VerdictBasis] = method === 'worst-case'
    ? worstCase.withinRequirement ? ['pass', 'worst-case-within'] : rss.withinRequirement ? ['review', 'only-rss-within'] : ['fail', 'rss-outside']
    : rss.withinRequirement ? ['pass', 'rss-within'] : twoSigma.withinRequirement ? ['review', 'only-two-sigma-within'] : ['fail', 'two-sigma-outside']
  const range = method === 'worst-case' ? worstCase : rss
  const lower = range.lowerMargin ?? Number.POSITIVE_INFINITY
  const upper = range.upperMargin ?? Number.POSITIVE_INFINITY
  const governing = Math.abs(lower - upper) <= LIMIT_TOLERANCE_MM ? 'both' : lower < upper ? 'lower' : 'upper'
  return { method, status, basis, governing }
}
