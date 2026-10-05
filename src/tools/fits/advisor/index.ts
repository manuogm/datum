/**
 * Fit advisor: public API.
 *
 * adviseFit ranks ISO 286 fits for a housing / shaft pair, taking differential
 * thermal expansion over the service temperature range into account.
 * Clearances in µm (negative = interference), temperatures in °C.
 * The judgement calls (scoring, rules of thumb) are all in rules.ts.
 */
export { adviseFit } from './advise'
export { ASSEMBLY_CLEARANCE_UM_PER_MM, COLDEST_SHAFT_COOLING_TEMP_C, LOCATE_MAX_CLEARANCE_IN_IT7, SCORE_PENALTY } from './rules'
export { clearanceAt, clearanceShiftUmPerK, diameterGrowthUmPerK, joiningTempC, REFERENCE_TEMP_C } from './thermal'
export type {
  AdvisorMaterial, ApplicationFunction, AssemblyMethod, Check, CheckId, CheckStatus, ClearanceAtTemperature,
  ClearanceRangeUm, FitAdvice, FitAdvisorInput, FitCandidate, TemperatureRangeC, ThermalAssembly,
} from './types'
