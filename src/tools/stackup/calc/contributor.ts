import { geometricDeviations } from './geometric'
import { SIGMAS_PER_HALF_BAND } from './rules'
import { SOURCE } from './sources'
import type { Contributor, ContributorResult, Conversion, PlainTolerance } from './types'

/** A contributor centred on its mean, before the shares of the stack are known. */
export type CentredContributor = Omit<ContributorResult, 'worstCasePercent' | 'rssPercent'>

/**
 * Unequal tolerances are stacked as mean ± half band: a dimension
 * nominal +u/+l (signed deviations, u ≥ l) has the same limits as
 * (nominal + (u + l)/2) ± (u − l)/2. Stacking the means and the equal
 * half bands gives the same worst-case limits as stacking the limits, and
 * is what RSS needs, since it assumes each dimension centred in its band
 * (Drake ch. 9; Fortini).
 */
function plainDeviations(nominal: number, tolerance: PlainTolerance): { readonly upper: number; readonly lower: number; readonly conversion: Conversion } {
  const conversion = (rule: string): Conversion => ({ rule, source: `${SOURCE.drakeStacks}; ${SOURCE.fortini}`, appliesWhen: null })
  switch (tolerance.kind) {
    case 'symmetric':
      return { upper: tolerance.plusMinus, lower: -tolerance.plusMinus, conversion: conversion('±t: already centred on nominal') }
    case 'deviations':
      return {
        upper: tolerance.upper,
        lower: tolerance.lower,
        conversion: conversion(tolerance.upper === -tolerance.lower
          ? '±t: already centred on nominal'
          : 'nominal +u/+l → mean (nominal + (u + l)/2) ± half band (u − l)/2'),
      }
    case 'limits':
      return {
        upper: tolerance.max - nominal,
        lower: tolerance.min - nominal,
        conversion: conversion('limits min … max → mean (min + max)/2 ± half band (max − min)/2'),
      }
  }
}

/**
 * A linked part stack enters an assembly with its worst-case band (for WC)
 * and its own σ (for RSS). σ of the part stack already combines the
 * variances of its contributors (σ² = Σσ_i²), so the assembly's
 * σ² = Σ σ_j² over its rows is the same as stacking every dimension of
 * every part directly, as long as no dimension appears in two rows
 * (independent contributors; Drake ch. 9 and ch. 11).
 */
const LINKED_CONVERSION: Conversion = {
  rule: 'linked part stack: worst case uses its WC band (nominal +upper/+lower deviation), RSS uses its σ',
  source: `${SOURCE.drakeStacks}; ${SOURCE.drakeQuality}`,
  appliesWhen: null,
}

/** One contributor as a band about its mean. Input is validated first (validate.ts). */
export function centredContributor(contributor: Contributor, index: number): CentredContributor {
  const base = { index, label: contributor.label, sign: contributor.sign, kind: contributor.kind }
  if (contributor.kind === 'linked') {
    const { nominal, upperDeviation, lowerDeviation, sigma } = contributor.stack
    return {
      ...base, nominal,
      min: nominal + lowerDeviation, max: nominal + upperDeviation,
      mean: nominal + (upperDeviation + lowerDeviation) / 2,
      halfBand: (upperDeviation - lowerDeviation) / 2,
      sigma, conversion: LINKED_CONVERSION,
    }
  }
  const { nominal, tolerance } = contributor
  const { upper, lower, conversion } = tolerance.kind === 'geometric' ? geometricDeviations(tolerance) : plainDeviations(nominal, tolerance)
  const halfBand = (upper - lower) / 2
  return {
    ...base, nominal,
    min: nominal + lower, max: nominal + upper,
    mean: nominal + (upper + lower) / 2,
    halfBand,
    // ±t = ±3σ (rules.ts).
    sigma: halfBand / SIGMAS_PER_HALF_BAND,
    conversion,
  }
}
