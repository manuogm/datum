import { fail, ok, type Result } from '../../../core/result'
import { analyseFitDesignation, PREFERRED_FITS, standardToleranceUm, type FitAnalysis } from '../calc'
import { candidateDesignations } from './candidates'
import { candidateChecks, shareInside, type CandidateClearances } from './checks'
import { explainBest } from './explain'
import { formatNumber } from './format'
import { ASSEMBLY_CLEARANCE_UM_PER_MM } from './rules'
import { scoreCandidate } from './score'
import { clearanceAt, clearanceShiftUmPerK, joiningTempC, REFERENCE_TEMP_C } from './thermal'
import type { AdvisorSettings, ClearanceAtTemperature, FitAdvice, FitAdvisorInput, FitCandidate, ThermalAssembly } from './types'

/**
 * Fit advisor: analyses every candidate ISO 286 fit at the given diameter,
 * corrects it for differential thermal expansion of housing and shaft,
 * checks it against the requirements and the application, and ranks it.
 * Returns an explanation instead of advice when the input is not usable.
 */
export function adviseFit(input: FitAdvisorInput): Result<FitAdvice> {
  const invalid = inputError(input)
  if (invalid) return fail(invalid)
  const settings: AdvisorSettings = {
    ...input,
    basis: input.basis ?? 'hole-basis',
    assemblyTempC: input.assemblyTempC ?? REFERENCE_TEMP_C,
  }
  // IT7 at the size: for the 'locate' rule; also checks the size is within ISO 286.
  const it7 = standardToleranceUm('7', settings.nominalMm)
  if (!it7.ok) return it7

  const shiftUmPerK = clearanceShiftUmPerK(
    settings.nominalMm, settings.housing.thermalExpansionUmPerMK, settings.shaft.thermalExpansionUmPerMK)
  // Fits that ISO 286 does not define at this size (e.g. some classes below 3 mm) are left out.
  const fits = candidateDesignations(settings.basis)
    .map((designation) => analyseFitDesignation(designation, settings.nominalMm))
    .flatMap((result) => (result.ok ? [result.value] : []))
  if (fits.length === 0) {
    return fail(`None of the candidate fits is defined by ISO 286 at ${formatNumber(settings.nominalMm)} mm.`)
  }
  const ranked = rank(fits.map((fit) => assessCandidate(settings, fit, shiftUmPerK, it7.value)), settings)
  return ok({
    clearanceShiftUmPerK: shiftUmPerK,
    candidates: ranked,
    why: explainBest(settings, ranked, shiftUmPerK),
    materialNotes: materialNotes(settings),
  })
}

function inputError(input: FitAdvisorInput): string | null {
  const { housing, shaft, serviceTempC, requiredClearanceUm, maxAssemblyInterferenceUm, assemblyTempC } = input
  const numbers = [
    housing.thermalExpansionUmPerMK, shaft.thermalExpansionUmPerMK, housing.maxServiceTempC, shaft.maxServiceTempC,
    serviceTempC.minC, serviceTempC.maxC, requiredClearanceUm.minUm, requiredClearanceUm.maxUm,
    maxAssemblyInterferenceUm, assemblyTempC ?? REFERENCE_TEMP_C,
  ]
  if (!numbers.every(Number.isFinite)) return 'Every temperature, clearance and expansion coefficient must be a number.'
  if (serviceTempC.minC > serviceTempC.maxC) return 'The service temperature range must go from the lower to the higher temperature.'
  if (requiredClearanceUm.minUm >= requiredClearanceUm.maxUm) {
    return 'The required clearance window must go from a smaller to a larger clearance (negative values are interference).'
  }
  if (maxAssemblyInterferenceUm < 0) return 'The maximum assembly interference is a size of interference: enter it as 0 or a positive number of µm.'
  return null
}

function assessCandidate(settings: AdvisorSettings, fit: FitAnalysis, shiftUmPerK: number, it7Um: number): FitCandidate {
  const fitAt20C = { minUm: fit.minClearanceUm, maxUm: fit.maxClearanceUm }
  const atServiceMin = clearanceAt(fitAt20C, shiftUmPerK, settings.serviceTempC.minC)
  const atServiceMax = clearanceAt(fitAt20C, shiftUmPerK, settings.serviceTempC.maxC)
  const atAssembly = clearanceAt(fitAt20C, shiftUmPerK, settings.assemblyTempC)
  // Clearance is linear in temperature, so its extremes over the range are at the range ends.
  const inServiceUm = {
    minUm: Math.min(atServiceMin.minUm, atServiceMax.minUm),
    maxUm: Math.max(atServiceMin.maxUm, atServiceMax.maxUm),
  }
  const clearances: CandidateClearances = {
    fit, atServiceMin, atServiceMax, atAssembly, inServiceUm,
    windowShare: shareInside(inServiceUm, settings.requiredClearanceUm),
    thermalAssembly: settings.assembly === 'thermal' ? thermalAssembly(settings, atAssembly) : null,
  }
  const checks = candidateChecks(settings, clearances, it7Um)
  return {
    ...clearances,
    preferred: PREFERRED_FITS.find((p) => p.designation === fit.designation) ?? null,
    checks,
    score: scoreCandidate(clearances.windowShare, checks),
  }
}

/**
 * Joining temperatures that turn the largest interference at assembly
 * temperature into ASSEMBLY_CLEARANCE_UM_PER_MM × D of clearance, by heating
 * the housing alone or cooling the shaft alone. Null when there is no interference.
 */
function thermalAssembly(settings: AdvisorSettings, atAssembly: ClearanceAtTemperature): ThermalAssembly | null {
  if (atAssembly.minUm >= 0) return null
  const { nominalMm, assemblyTempC, housing, shaft } = settings
  const assemblyClearanceUm = ASSEMBLY_CLEARANCE_UM_PER_MM * nominalMm
  const gainUm = -atAssembly.minUm + assemblyClearanceUm
  return {
    assemblyClearanceUm,
    housingHeatTempC: joiningTempC(assemblyTempC, gainUm, nominalMm, housing.thermalExpansionUmPerMK, 'heat'),
    shaftCoolTempC: joiningTempC(assemblyTempC, gainUm, nominalMm, shaft.thermalExpansionUmPerMK, 'cool'),
  }
}

/**
 * Best first: highest score; on equal scores, the fit whose mid in-service
 * clearance is closest to the middle of the required window.
 */
function rank(candidates: readonly FitCandidate[], settings: AdvisorSettings): readonly FitCandidate[] {
  const { minUm, maxUm } = settings.requiredClearanceUm
  const windowMidUm = (minUm + maxUm) / 2
  const offCentreUm = (c: FitCandidate) => Math.abs((c.inServiceUm.minUm + c.inServiceUm.maxUm) / 2 - windowMidUm)
  return [...candidates].sort((a, b) => b.score - a.score || offCentreUm(a) - offCentreUm(b))
}

/** Materials used above their indicative service limit (see Material.maxServiceTempC). */
function materialNotes({ housing, shaft, serviceTempC }: AdvisorSettings): readonly string[] {
  const parts = housing.name === shaft.name ? [housing] : [housing, shaft]
  return parts
    .filter((m) => serviceTempC.maxC > m.maxServiceTempC)
    .map((m) => `${m.name} is advised for sustained service up to about ${formatNumber(m.maxServiceTempC)} °C;`
      + ` the service range reaches ${formatNumber(serviceTempC.maxC)} °C.`)
}
