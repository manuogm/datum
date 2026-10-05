import type { FitAnalysis } from '../calc'
import { formatNumber, formatRange } from './format'
import { COLDEST_SHAFT_COOLING_TEMP_C, LOCATE_MAX_CLEARANCE_IN_IT7 } from './rules'
import type {
  AdvisorSettings, Check, ClearanceAtTemperature, ClearanceRangeUm, FitAdvisorInput, ThermalAssembly,
} from './types'

/** What the checks need to know about one candidate fit. */
export interface CandidateClearances {
  readonly fit: FitAnalysis
  readonly atServiceMin: ClearanceAtTemperature
  readonly atServiceMax: ClearanceAtTemperature
  readonly atAssembly: ClearanceAtTemperature
  readonly inServiceUm: ClearanceRangeUm
  readonly windowShare: number
  readonly thermalAssembly: ThermalAssembly | null
}

/** All checks that apply to this application, in display order. The rules are explained in rules.ts. */
export function candidateChecks(settings: AdvisorSettings, c: CandidateClearances, it7Um: number): readonly Check[] {
  const has = (f: FitAdvisorInput['functions'][number]) => settings.functions.includes(f)
  return [
    serviceWindowCheck(settings, c),
    assemblyInterferenceCheck(settings, c.atAssembly),
    settings.assembly === 'by-hand' ? byHandCheck(c.atAssembly) : null,
    settings.assembly === 'thermal' ? thermalAssemblyCheck(settings, c) : null,
    has('locate') ? locateCheck(c.inServiceUm, it7Um) : null,
    has('transmit-torque') ? transmitTorqueCheck(c) : null,
    has('slide') || has('rotate') ? slideRotateCheck(c) : null,
    has('disassemble-often') ? disassembleOftenCheck(c.atAssembly) : null,
  ].filter((check) => check !== null)
}

/** Share (0 … 1) of the range `actual` that lies inside `window`. */
export function shareInside(actual: ClearanceRangeUm, window: ClearanceRangeUm): number {
  const overlapUm = Math.min(actual.maxUm, window.maxUm) - Math.max(actual.minUm, window.minUm)
  const widthUm = actual.maxUm - actual.minUm
  if (widthUm <= 0) return overlapUm >= 0 ? 1 : 0
  return Math.max(0, overlapUm) / widthUm
}

function serviceWindowCheck(settings: AdvisorSettings, c: CandidateClearances): Check {
  const { serviceTempC, requiredClearanceUm: window } = settings
  const actual = `${formatRange(c.inServiceUm.minUm, c.inServiceUm.maxUm, 'µm')} over ${formatRange(serviceTempC.minC, serviceTempC.maxC, '°C')}`
  const required = `the required ${formatRange(window.minUm, window.maxUm, 'µm')}`
  if (c.windowShare === 1) return { id: 'service-window', status: 'pass', message: `${actual}: all inside ${required}.` }
  if (c.windowShare === 0) return { id: 'service-window', status: 'fail', message: `${actual}: none inside ${required}.` }
  const percent = Math.round(c.windowShare * 100)
  return { id: 'service-window', status: 'warn', message: `${actual}: ${percent} % inside ${required}.` }
}

function interferenceUm(at: ClearanceRangeUm): number {
  return Math.max(0, -at.minUm)
}

function assemblyInterferenceCheck(settings: AdvisorSettings, atAssembly: ClearanceAtTemperature): Check {
  const limitUm = settings.maxAssemblyInterferenceUm
  const actualUm = interferenceUm(atAssembly)
  const at = `at ${formatNumber(atAssembly.tempC)} °C`
  if (actualUm === 0) {
    return { id: 'assembly-interference', status: 'pass', message: `No interference ${at}.` }
  }
  return actualUm <= limitUm
    ? { id: 'assembly-interference', status: 'pass', message: `Up to ${formatNumber(actualUm)} µm interference ${at} (limit ${formatNumber(limitUm)} µm).` }
    : { id: 'assembly-interference', status: 'fail', message: `Up to ${formatNumber(actualUm)} µm interference ${at} exceeds the ${formatNumber(limitUm)} µm limit.` }
}

function byHandCheck(atAssembly: ClearanceAtTemperature): Check {
  return atAssembly.minUm >= 0
    ? { id: 'by-hand', status: 'pass', message: `Clearance at ${formatNumber(atAssembly.tempC)} °C: assembles by hand.` }
    : { id: 'by-hand', status: 'fail', message: `Up to ${formatNumber(interferenceUm(atAssembly))} µm interference at ${formatNumber(atAssembly.tempC)} °C: needs a press or heating.` }
}

function thermalAssemblyCheck(settings: AdvisorSettings, c: CandidateClearances): Check {
  const thermal = c.thermalAssembly
  if (thermal === null) {
    return { id: 'thermal-assembly', status: 'pass', message: `Clearance at ${formatNumber(c.atAssembly.tempC)} °C: no heating needed.` }
  }
  const { housingHeatTempC: heatC, shaftCoolTempC: coolC, assemblyClearanceUm } = thermal
  const forClearance = `for ${formatNumber(assemblyClearanceUm)} µm joining clearance`
  const canCool = coolC !== null && coolC >= COLDEST_SHAFT_COOLING_TEMP_C
  const cooling = coolC === null ? 'the shaft does not shrink when cooled'
    : canCool ? `cool the shaft to ≤ ${formatNumber(coolC)} °C`
      : `cooling the shaft would need ${formatNumber(coolC)} °C, colder than liquid nitrogen`
  if (heatC === null) {
    return canCool
      ? { id: 'thermal-assembly', status: 'warn', message: `The housing does not expand when heated: ${cooling} ${forClearance}.` }
      : { id: 'thermal-assembly', status: 'fail', message: `The housing does not expand when heated and ${cooling}.` }
  }
  const heating = `Heat the housing to ≥ ${formatNumber(heatC)} °C ${forClearance}`
  const heatLimitC = settings.housing.maxServiceTempC
  if (heatC <= heatLimitC) {
    return { id: 'thermal-assembly', status: 'pass', message: `${heating} (or ${cooling}).` }
  }
  const tooHot = `${heating}: above the ${formatNumber(heatLimitC)} °C service limit of ${settings.housing.name}`
  return canCool
    ? { id: 'thermal-assembly', status: 'warn', message: `${tooHot}; ${cooling} instead.` }
    : { id: 'thermal-assembly', status: 'warn', message: `${tooHot}, so check its temper accepts a short exposure (${cooling}).` }
}

function locateCheck(inServiceUm: ClearanceRangeUm, it7Um: number): Check {
  const limitUm = LOCATE_MAX_CLEARANCE_IN_IT7 * it7Um
  const limit = `${formatNumber(limitUm)} µm (${LOCATE_MAX_CLEARANCE_IN_IT7} × IT7)`
  return inServiceUm.maxUm <= limitUm
    ? { id: 'locate', status: 'pass', message: `Max clearance in service ${formatNumber(inServiceUm.maxUm)} µm ≤ ${limit}: locates.` }
    : { id: 'locate', status: 'warn', message: `Up to ${formatNumber(inServiceUm.maxUm)} µm clearance in service; accurate location needs ≤ ${limit}.` }
}

function transmitTorqueCheck(c: CandidateClearances): Check {
  if (c.inServiceUm.maxUm < 0) {
    return { id: 'transmit-torque', status: 'pass', message: 'Interference at every service temperature: torque can be carried by friction.' }
  }
  const loosest = c.atServiceMax.maxUm >= c.atServiceMin.maxUm ? c.atServiceMax : c.atServiceMin
  return { id: 'transmit-torque', status: 'warn',
    message: `Up to ${formatNumber(loosest.maxUm)} µm clearance at ${formatNumber(loosest.tempC)} °C: carry the torque with a key, pin or spline.` }
}

function slideRotateCheck(c: CandidateClearances): Check {
  if (c.inServiceUm.minUm >= 0) {
    return { id: 'slide-rotate', status: 'pass', message: 'Clearance at every service temperature: free to slide or turn.' }
  }
  const tightest = c.atServiceMax.minUm <= c.atServiceMin.minUm ? c.atServiceMax : c.atServiceMin
  return { id: 'slide-rotate', status: 'fail',
    message: `Up to ${formatNumber(-tightest.minUm)} µm interference at ${formatNumber(tightest.tempC)} °C: the parts can seize.` }
}

function disassembleOftenCheck(atAssembly: ClearanceAtTemperature): Check {
  const at = `at ${formatNumber(atAssembly.tempC)} °C`
  if (atAssembly.maxUm <= 0) {
    return { id: 'disassemble-often', status: 'fail', message: `Interference fit ${at}: every disassembly needs a press or heat and wears the joint.` }
  }
  return atAssembly.minUm < 0
    ? { id: 'disassemble-often', status: 'warn', message: `Transition fit ${at}: some part pairs will need a press to separate.` }
    : { id: 'disassemble-often', status: 'pass', message: `Clearance ${at}: separates freely.` }
}
