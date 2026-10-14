import { geometricDeviations } from './geometric'
import { SIGMAS_PER_HALF_BAND } from './rules'
import { SOURCE } from './sources'
import type { Contributor, ContributorResult, Conversion, DrawingStandard, GeometricBreakdown, PlainTolerance } from './types'

/** A contributor centred on its mean, before the shares of the stack are known. */
export type CentredContributor = Omit<ContributorResult, 'worstCasePercent' | 'rssPercent'>

const conversionOf = (rule: string, source: string): Conversion => ({ rule, source, appliesWhen: null, unsure: null, modifiers: [] })

/**
 * Unequal tolerances are stacked as mean ± half band: a dimension
 * nominal +u/+l (signed deviations, u ≥ l) has the same limits as
 * (nominal + (u + l)/2) ± (u − l)/2. Stacking the means and the equal
 * half bands gives the same worst-case limits as stacking the limits, and
 * is what RSS needs, since it assumes each dimension centred in its band
 * (Drake ch. 9; Fortini).
 */
function plainDeviations(nominal: number, tolerance: PlainTolerance): { readonly upper: number; readonly lower: number; readonly conversion: Conversion } {
  const source = `${SOURCE.drakeStacks}; ${SOURCE.fortini}`
  switch (tolerance.kind) {
    case 'symmetric':
      return { upper: tolerance.plusMinus, lower: -tolerance.plusMinus, conversion: conversionOf('±t: already centred on nominal', source) }
    case 'deviations':
      return {
        upper: tolerance.upper,
        lower: tolerance.lower,
        conversion: conversionOf(tolerance.upper === -tolerance.lower
          ? '±t: already centred on nominal'
          : 'nominal +u/+l → mean (nominal + (u + l)/2) ± half band (u − l)/2', source),
      }
    case 'limits':
      return {
        upper: tolerance.max - nominal,
        lower: tolerance.min - nominal,
        conversion: conversionOf('limits min … max → mean (min + max)/2 ± half band (max − min)/2', source),
      }
  }
}

/**
 * A linked part stack enters an assembly with its worst-case band (for WC)
 * and its own σ (for RSS). σ of the part stack already combines the
 * variances of its contributors (σ² = Σ(a_i·σ_i)²), so the assembly's
 * σ² = Σ(a_j·σ_j)² over its rows is the same as stacking every dimension of
 * every part directly, as long as no dimension appears in two rows
 * (independent contributors; Drake ch. 9 and ch. 11).
 */
const LINKED_CONVERSION = conversionOf(
  'linked part stack: worst case uses its WC band (nominal +upper/+lower deviation), RSS uses its σ',
  `${SOURCE.drakeStacks}; ${SOURCE.drakeQuality}`,
)

/**
 * ⟨ST⟩ on a tolerance: it is to be produced under statistical process
 * control, so the stack may treat it statistically. In the worst-case
 * method, the ⟨ST⟩ rows are combined by RSS and added arithmetically to the
 * rest (analyseStack.ts).
 */
const STATISTICAL_NOTE = `⟨ST⟩ statistical tolerance: combined by RSS with the other ⟨ST⟩ rows, also in the worst-case result (${SOURCE.statisticalTolerance}).`

/** One contributor as a band about its mean. Input is validated first (validate.ts). */
export function centredContributor(contributor: Contributor, index: number, standard: DrawingStandard = 'iso'): CentredContributor {
  const base = { index, label: contributor.label, sensitivity: contributor.sensitivity, kind: contributor.kind }
  if (contributor.kind === 'linked') {
    const { nominal, upperDeviation, lowerDeviation, sigma } = contributor.stack
    return {
      ...base, statistical: false, nominal,
      min: nominal + lowerDeviation, max: nominal + upperDeviation,
      mean: nominal + (upperDeviation + lowerDeviation) / 2,
      meanShift: (upperDeviation + lowerDeviation) / 2,
      halfBand: (upperDeviation - lowerDeviation) / 2,
      sigma, conversion: LINKED_CONVERSION, geometric: null,
    }
  }
  const { nominal, tolerance } = contributor
  const statistical = contributor.statistical === true
  let deviations: { readonly upper: number; readonly lower: number; readonly conversion: Conversion }
  let geometric: GeometricBreakdown | null = null
  if (tolerance.kind === 'geometric') {
    const converted = geometricDeviations(tolerance, standard)
    deviations = converted
    geometric = converted.breakdown
  } else {
    deviations = plainDeviations(nominal, tolerance)
  }
  const { upper, lower } = deviations
  const conversion = statistical
    ? { ...deviations.conversion, modifiers: [...deviations.conversion.modifiers, STATISTICAL_NOTE] }
    : deviations.conversion
  const halfBand = (upper - lower) / 2
  return {
    ...base, statistical, nominal,
    min: nominal + lower, max: nominal + upper,
    mean: nominal + (upper + lower) / 2,
    meanShift: (upper + lower) / 2,
    halfBand,
    // ±t = ±3σ (rules.ts).
    sigma: halfBand / SIGMAS_PER_HALF_BAND,
    conversion, geometric,
  }
}
