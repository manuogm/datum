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
 * The RSS method grades the result by its capability index Cpk
 * (min(USL − µ, µ − LSL)/3σ over the limits given, one-sided with one
 * limit), with the thresholds of the AIAG SPC Reference Manual (2nd ed.
 * 2005) and Montgomery §8.3:
 * - Cpk ≥ 1.33 (±4σ inside, about 32 ppm out on one side at most): capable, pass;
 * - 1.00 ≤ Cpk < 1.33 (±3σ inside, up to 0.135 % out per side): marginal, review;
 * - Cpk < 1.00 (±3σ outside): not capable, fail.
 */
export const CPK_PASS = 1.33
export const CPK_REVIEW = 1

/**
 * @deprecated The RSS method no longer grades by ±2σ (it is graded by Cpk,
 * see CPK_PASS). Kept so older callers compile.
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
 * RSS, by capability (CPK_PASS, CPK_REVIEW):
 * - pass:   Cpk ≥ 1.33 ('rss-capable').
 * - review: 1.00 ≤ Cpk < 1.33 ('rss-marginal').
 * - fail:   Cpk < 1.00, mean ± 3σ outside ('rss-not-capable').
 * With σ = 0 there is no Cpk: every result is the mean, so pass when the
 * mean meets the requirement and fail when not.
 *
 * Cpk is worked out from the RSS range itself (rssCpk), so this needs no
 * more than the two ranges. The 4th argument (the ±2σ range of the old
 * grading) is ignored and kept so older callers compile.
 * governing: the limit with the smaller margin by the chosen method; 'both'
 * when the margins are equal (a centred result between two limits).
 */
export function verdictOf(method: StackMethod, worstCase: MethodRange, rss: MethodRange, _twoSigma?: MethodRange): Verdict | null {
  if (worstCase.withinRequirement === null) return null
  const [status, basis]: [VerdictStatus, VerdictBasis] = method === 'worst-case'
    ? worstCase.withinRequirement ? ['pass', 'worst-case-within'] : rss.withinRequirement ? ['review', 'only-rss-within'] : ['fail', 'rss-outside']
    : rssGrade(rss)
  const range = method === 'worst-case' ? worstCase : rss
  const lower = range.lowerMargin ?? Number.POSITIVE_INFINITY
  const upper = range.upperMargin ?? Number.POSITIVE_INFINITY
  const governing = Math.abs(lower - upper) <= LIMIT_TOLERANCE_MM ? 'both' : lower < upper ? 'lower' : 'upper'
  return { method, status, basis, governing }
}

/**
 * Cpk from the RSS range mean ± 3σ and its margins: the distance from the
 * mean to a limit is margin + 3σ, so that side's index is
 * (margin + 3σ)/3σ = 1 + margin/halfBand (Montgomery §8.3). The smaller over
 * the limits given; one-sided (Cpu or Cpl) with one limit. Equal to
 * capability().cpk. null when σ = 0 or without a requirement.
 */
export function rssCpk(rss: MethodRange): number | null {
  const margins = [rss.lowerMargin, rss.upperMargin].filter((margin) => margin !== null)
  if (!(rss.halfBand > 0) || margins.length === 0) return null
  return 1 + Math.min(...margins) / rss.halfBand
}

/** Status and basis of the RSS method by Cpk (CPK_PASS, CPK_REVIEW); see verdictOf. */
function rssGrade(rss: MethodRange): [VerdictStatus, VerdictBasis] {
  const cpk = rssCpk(rss)
  // Thresholds met to within round-off count as met, like LIMIT_TOLERANCE_MM for the limits.
  const atLeast = (value: number, threshold: number) => value >= threshold - 1e-12
  if (cpk === null) return rss.withinRequirement ? ['pass', 'rss-capable'] : ['fail', 'rss-not-capable']
  if (atLeast(cpk, CPK_PASS)) return ['pass', 'rss-capable']
  return atLeast(cpk, CPK_REVIEW) ? ['review', 'rss-marginal'] : ['fail', 'rss-not-capable']
}
