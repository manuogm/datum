import { advisorFormat } from './format'
import { REFERENCE_TEMP_C } from './thermal'
import type { AdvisorSettings, FitCandidate } from './types'

/**
 * The "why" text of the Fit advisor, two or three short sentences: the
 * physical reason (differential expansion, with the numbers) and the verdict.
 * The per-check detail is left to the checks list. `ranked` is best first, not empty.
 */
export function explainBest(settings: AdvisorSettings, ranked: readonly FitCandidate[], shiftUmPerK: number): string {
  return [thermalSentence(settings, shiftUmPerK), ...verdictSentences(settings, ranked, shiftUmPerK)].join(' ')
}

function thermalSentence({ housing, shaft, serviceTempC, unitSystem }: AdvisorSettings, shiftUmPerK: number): string {
  const f = advisorFormat(unitSystem)
  if (shiftUmPerK === 0) {
    return `Housing (${housing.name}) and shaft (${shaft.name}) expand alike, so temperature does not change the fit.`
  }
  const [more, less] = shiftUmPerK > 0 ? [`${housing.name} housing`, `${shaft.name} shaft`] : [`${shaft.name} shaft`, `${housing.name} housing`]
  const alphas = `α ${f.expansionPair(housing.thermalExpansionUmPerMK, shaft.thermalExpansionUmPerMK)}`
  const change = (tempC: number) => `${f.clearanceChange(shiftUmPerK * (tempC - REFERENCE_TEMP_C))} at ${f.temperature(tempC)}`
  return `The ${more} expands more than the ${less} (${alphas}), so the clearance shifts ${change(serviceTempC.minC)}`
    + ` and ${change(serviceTempC.maxC)} from its ${f.temperature(REFERENCE_TEMP_C)} value.`
}

function verdictSentences(settings: AdvisorSettings, ranked: readonly FitCandidate[], shiftUmPerK: number): readonly string[] {
  const best = ranked[0]
  const { requiredClearanceUm: window, serviceTempC, unitSystem } = settings
  const f = advisorFormat(unitSystem)
  const windowText = f.clearanceRange(window.minUm, window.maxUm)
  const bestText = `${best.fit.designation} (score ${best.score})`
  if (best.windowShare === 1) {
    return [`${bestText} stays inside ${windowText} at every service temperature.`]
  }
  const inService = f.clearanceRange(best.inServiceUm.minUm, best.inServiceUm.maxUm)
  if (ranked.some((c) => c.windowShare === 1)) {
    return [`${bestText} is the best balance of the requirements, with ${inService} in service.`]
  }
  const closest = `${bestText} comes closest, with ${inService} in service.`
  const thermalChangeUm = Math.abs(shiftUmPerK) * (serviceTempC.maxC - serviceTempC.minC)
  const smallestFitToleranceUm = Math.min(...ranked.map((c) => c.fit.fitToleranceUm))
  const windowWidthUm = window.maxUm - window.minUm
  const reason = thermalChangeUm + smallestFitToleranceUm > windowWidthUm
    ? `: the ${f.clearance(thermalChangeUm)} thermal swing plus the tightest fit tolerance (${f.clearance(smallestFitToleranceUm)}) is wider than the window`
    : ''
  return [`No ISO fit stays inside ${windowText} over the whole service range${reason}.`, closest]
}
