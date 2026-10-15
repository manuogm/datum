import { fail, ok, type Result } from '../../../core/result'
import { centredContributor, type CentredContributor } from './contributor'
import { normalUpperTail } from './normal'
import { DEFAULT_METHOD, LIMIT_TOLERANCE_MM, SIGMAS_PER_HALF_BAND, verdictOf } from './rules'
import type { Capability, ContributorResult, FractionOutOfSpec, LinkedStackContributor, MethodRange, Requirement, StackAnalysis, StackInput, StackResult } from './types'
import { inputError, inputWarnings } from './validate'

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

/** The result range mean ± halfBand and its margins to the requirement. */
export function methodRange(mean: number, halfBand: number, requirement: Requirement | null): MethodRange {
  const min = mean - halfBand
  const max = mean + halfBand
  const lowerMargin = requirement?.min === undefined ? null : min - requirement.min
  const upperMargin = requirement?.max === undefined ? null : requirement.max - max
  return {
    min, max, halfBand, lowerMargin, upperMargin,
    withinRequirement: requirement === null ? null
      : (lowerMargin ?? 0) >= -LIMIT_TOLERANCE_MM && (upperMargin ?? 0) >= -LIMIT_TOLERANCE_MM,
  }
}

/**
 * Fraction of results outside the requirement for a normal result
 * N(mean, σ): Φ((LSL − µ)/σ) below and 1 − Φ((USL − µ)/σ) above
 * (Drake ch. 11). With σ = 0 every result is the mean.
 */
export function fractionOutOfSpec(mean: number, sigma: number, requirement: Requirement): FractionOutOfSpec {
  const tail = (distance: number) => (sigma > 0 ? normalUpperTail(distance / sigma) : distance < -LIMIT_TOLERANCE_MM ? 1 : 0)
  const below = requirement.min === undefined ? 0 : tail(mean - requirement.min)
  const above = requirement.max === undefined ? 0 : tail(requirement.max - mean)
  return { below, above, total: below + above }
}

/**
 * Process capability of the result (Montgomery §8.3; Drake ch. 11):
 * Cp = (USL − LSL) / 6σ, both limits needed;
 * Cpk = min(USL − µ, µ − LSL) / 3σ, over the limits given (Cpu or Cpl alone
 * with one limit). Both null when σ = 0 (every result the same).
 */
export function capability(mean: number, sigma: number, requirement: Requirement | null): Capability {
  if (!requirement || !(sigma > 0)) return { cp: null, cpk: null }
  const { min, max } = requirement
  const sides = [max === undefined ? null : (max - mean) / (3 * sigma), min === undefined ? null : (mean - min) / (3 * sigma)]
    .filter((value) => value !== null)
  return {
    cp: min !== undefined && max !== undefined ? (max - min) / (6 * sigma) : null,
    cpk: sides.length > 0 ? Math.min(...sides) : null,
  }
}

/** Index of the largest share, or null when every share is zero. */
function dominantIndex(shares: readonly number[]): number | null {
  const largest = Math.max(...shares)
  return largest > 0 ? shares.indexOf(largest) : null
}

/**
 * Worst-case and RSS stack of a one-dimensional chain (loop diagram) with
 * sensitivity coefficients a_i (±1 in 1D). Every contributor is first
 * centred: mean_i ± t_i (contributor.ts, geometric.ts). Then (Drake ch. 9;
 * Fortini):
 *
 *   nominal  = Σ a_i·nominal_i                 (as entered)
 *   mean     = Σ a_i·mean_i
 *   WC       = mean ± Σ|a_i|·t_i                (every dimension at its worst limit)
 *   σ        = √Σ(a_i·σ_i)², σ_i = t_i/3        (independent normal dimensions, ±t = ±3σ)
 *   RSS      = mean ± 3σ = mean ± √Σ(a_i·t_i)²  (for dimension rows)
 *
 * ⟨ST⟩ rows in the worst-case result (hybrid stack): the ⟨ST⟩ rows are
 * combined by RSS and added to the arithmetic sum of the others,
 *   WC = mean ± (Σ_others |a_i|·t_i + √Σ_ST (a_i·t_i)²)
 * (ASME Y14.5-2018 statistical tolerancing; Drake ch. 9). Their share of the
 * WC band is that RSS part split by variance.
 * Each row splits its half band t_i into an arithmetic part and an ⟨ST⟩
 * part s_i (ContributorResult.statisticalHalfBand): s_i = t_i for an ⟨ST⟩
 * row, 0 for another dimension, and the part's own ⟨ST⟩ part for a linked
 * stack. So
 *   WC = mean ± (Σ |a_i|·(t_i − s_i) + √Σ (a_i·s_i)²)
 * and the StackResult keeps both parts. A linked part's ⟨ST⟩ part is
 * √Σ over its ⟨ST⟩ rows, so squaring it again in the assembly gives the
 * same sum as entering those rows directly.
 *
 * Linked part stacks (Assembly mode) enter with their WC band and their σ:
 * the part's σ already combines its own rows, so the assembly's σ is the
 * same as stacking every row of every part directly (contributor.ts).
 *
 * Shares: WC |a_i|·t_i / Σ, RSS (a_i·σ_i)² / Σ(a·σ)².
 * Returns an explanation instead of a result when the input is not usable;
 * never throws.
 */
export function analyseStack(input: StackInput): Result<StackAnalysis> {
  const invalid = inputError(input)
  if (invalid) return fail(invalid)
  const standard = input.standard ?? 'iso'
  const method = input.method ?? DEFAULT_METHOD
  const requirement = input.requirement && (input.requirement.min !== undefined || input.requirement.max !== undefined) ? input.requirement : null
  const rows: readonly CentredContributor[] = input.contributors.map((contributor, index) => centredContributor(contributor, index, standard))

  const nominal = sum(rows.map((row) => row.sensitivity * row.nominal))
  const mean = sum(rows.map((row) => row.sensitivity * row.mean))

  // |a_i|·(t_i − s_i) added arithmetically, |a_i|·s_i combined by RSS.
  const arithmeticBands = rows.map((row) => Math.abs(row.sensitivity) * Math.max(row.halfBand - row.statisticalHalfBand, 0))
  const statisticalBands = rows.map((row) => Math.abs(row.sensitivity) * row.statisticalHalfBand)
  const arithmeticPart = sum(arithmeticBands)
  const statisticalVariance = sum(statisticalBands.map((band) => band ** 2))
  const statisticalPart = Math.sqrt(statisticalVariance)
  const worstCaseHalfBand = arithmeticPart + statisticalPart

  const variances = rows.map((row) => (row.sensitivity * row.sigma) ** 2)
  const variance = sum(variances)
  const sigma = Math.sqrt(variance)

  const percent = (part: number, whole: number) => (whole > 0 ? (100 * part) / whole : 0)
  const contributors: readonly ContributorResult[] = rows.map((row, i) => ({
    ...row,
    // The arithmetic part as it is, the ⟨ST⟩ part's share of √Σs² by variance.
    worstCasePercent: percent(
      arithmeticBands[i] + (statisticalVariance > 0 ? (statisticalPart * statisticalBands[i] ** 2) / statisticalVariance : 0),
      worstCaseHalfBand,
    ),
    rssPercent: percent(variances[i], variance),
  }))

  const worstCase = methodRange(mean, worstCaseHalfBand, requirement)
  const rss = methodRange(mean, SIGMAS_PER_HALF_BAND * sigma, requirement)
  const stackResult: StackResult = {
    name: input.name,
    nominal,
    mean,
    upperDeviation: worstCase.max - nominal,
    lowerDeviation: worstCase.min - nominal,
    sigma,
    arithmeticHalfBand: arithmeticPart,
    statisticalHalfBand: statisticalPart,
  }
  return ok({
    name: input.name,
    contributors,
    nominal,
    mean,
    sigma,
    worstCase,
    rss,
    requirement,
    method,
    verdict: verdictOf(method, worstCase, rss),
    fractionOutOfSpec: requirement ? fractionOutOfSpec(mean, sigma, requirement) : null,
    capability: capability(mean, sigma, requirement),
    dominant: {
      worstCase: dominantIndex(contributors.map((row) => row.worstCasePercent)),
      rss: dominantIndex(contributors.map((row) => row.rssPercent)),
    },
    stackResult,
    warnings: inputWarnings(input),
  })
}

/** A part stack as an Assembly row: the StackResult with a direction (sensitivity ±1). */
export function linkedContributor(stack: StackResult, sensitivity: number, label: string = stack.name): LinkedStackContributor {
  return { kind: 'linked', label, sensitivity, stack }
}
