import type { FitAnalysis } from '../calc'
import { advisorFormat, type AdvisorFormat } from './format'
import { shareInside, type InServiceClearance } from './inService'
import { COLDEST_SHAFT_COOLING_TEMP_C, LOCATE_MAX_CLEARANCE_IN_IT7, SCORE_POINTS } from './rules'
import type {
  AdvisorSettings, Check, ClearanceAtTemperature, ClearanceRangeUm, FitAdvisorInput, ThermalAssembly,
} from './types'

/** What the checks need to know about one candidate fit. */
export interface CandidateClearances extends InServiceClearance {
  readonly fit: FitAnalysis
  readonly atAssembly: ClearanceAtTemperature
  readonly thermalAssembly: ThermalAssembly | null
}

/** All checks that apply to this application, in display order. The rules and their points are explained in rules.ts. */
export function candidateChecks(settings: AdvisorSettings, c: CandidateClearances, it7Um: number): readonly Check[] {
  const has = (fn: FitAdvisorInput['functions'][number]) => settings.functions.includes(fn)
  const f = advisorFormat(settings.unitSystem)
  return [
    serviceWindowCheck(settings, c, f),
    assemblyInterferenceCheck(settings, c.atAssembly, f),
    settings.assembly === 'by-hand' ? byHandCheck(c.atAssembly, f) : null,
    settings.assembly === 'thermal' ? thermalAssemblyCheck(settings, c, f) : null,
    has('locate') ? locateCheck(c.inServiceUm, it7Um, f) : null,
    has('transmit-torque') ? transmitTorqueCheck(c, f) : null,
    has('slide') || has('rotate') ? slideRotateCheck(c, f) : null,
    has('disassemble-often') ? disassembleOftenCheck(c.atAssembly, f) : null,
  ].filter((check) => check !== null)
}

/** How far (µm) a clearance range goes outside the window, below and above it together. */
export function excursionOutsideUm(actual: ClearanceRangeUm, window: ClearanceRangeUm): number {
  return Math.max(0, window.minUm - actual.minUm) + Math.max(0, actual.maxUm - window.maxUm)
}

function serviceWindowCheck(settings: AdvisorSettings, c: CandidateClearances, f: AdvisorFormat): Check {
  const { serviceTempC, requiredClearanceUm: window } = settings
  const ends = [c.atServiceMin, c.atServiceMax].map((at) => ({ at, excursionUm: excursionOutsideUm(at, window) }))
  const worst = ends[1].excursionUm > ends[0].excursionUm ? ends[1] : ends[0]
  const penalty = SCORE_POINTS.windowPerWidth * worst.excursionUm / (window.maxUm - window.minUm)
  const actual = `${f.clearanceRange(c.inServiceUm.minUm, c.inServiceUm.maxUm)} over ${f.temperatureRange(serviceTempC.minC, serviceTempC.maxC)}`
  const required = `the required ${f.clearanceRange(window.minUm, window.maxUm)}`
  if (c.windowStatus === 'pass') return { id: 'service-window', status: 'pass', penalty, message: `${actual}: all inside ${required}.` }
  const worstText = `up to ${f.clearance(worst.excursionUm)} outside it at ${f.temperature(worst.at.tempC)}`
  return c.windowStatus === 'fail'
    ? { id: 'service-window', status: 'fail', penalty, message: `${actual}: none inside ${required}, ${worstText}.` }
    : { id: 'service-window', status: 'warn', penalty, message: `${actual}: ${Math.round(c.windowShare * 100)} % inside ${required}, ${worstText}.` }
}

function interferenceUm(at: ClearanceRangeUm): number {
  return Math.max(0, -at.minUm)
}

function assemblyInterferenceCheck(settings: AdvisorSettings, atAssembly: ClearanceAtTemperature, f: AdvisorFormat): Check {
  const limitUm = settings.maxAssemblyInterferenceUm
  const actualUm = interferenceUm(atAssembly)
  const at = `at ${f.temperature(atAssembly.tempC)}`
  if (actualUm === 0) {
    return { id: 'assembly-interference', status: 'pass', penalty: 0, message: `No interference ${at}.` }
  }
  return actualUm <= limitUm
    ? { id: 'assembly-interference', status: 'pass', penalty: 0,
      message: `Up to ${f.clearance(actualUm)} interference ${at} (limit ${f.clearance(limitUm)}).` }
    : { id: 'assembly-interference', status: 'fail', penalty: SCORE_POINTS.hardLimit,
      message: `Up to ${f.clearance(actualUm)} interference ${at} exceeds the ${f.clearance(limitUm)} limit.` }
}

function byHandCheck(atAssembly: ClearanceAtTemperature, f: AdvisorFormat): Check {
  return atAssembly.minUm >= 0
    ? { id: 'by-hand', status: 'pass', penalty: 0, message: `Clearance at ${f.temperature(atAssembly.tempC)}: assembles by hand.` }
    : { id: 'by-hand', status: 'fail', penalty: SCORE_POINTS.hardLimit, message: `Up to ${f.clearance(interferenceUm(atAssembly))} interference at ${f.temperature(atAssembly.tempC)}: needs a press or heating.` }
}

function thermalAssemblyCheck(settings: AdvisorSettings, c: CandidateClearances, f: AdvisorFormat): Check {
  const thermal = c.thermalAssembly
  if (thermal === null) {
    return { id: 'thermal-assembly', status: 'pass', penalty: 0, message: `Clearance at ${f.temperature(c.atAssembly.tempC)}: no heating needed.` }
  }
  const { housingHeatTempC: heatC, shaftCoolTempC: coolC, assemblyClearanceUm } = thermal
  const forClearance = `for ${f.clearance(assemblyClearanceUm)} joining clearance`
  const canCool = coolC !== null && coolC >= COLDEST_SHAFT_COOLING_TEMP_C
  const cooling = coolC === null ? 'the shaft does not shrink when cooled'
    : canCool ? `cool the shaft to ≤ ${f.temperature(coolC)}`
      : `cooling the shaft would need ${f.temperature(coolC)}, colder than liquid nitrogen`
  if (heatC === null) {
    return canCool
      ? { id: 'thermal-assembly', status: 'warn', penalty: 0, message: `The housing does not expand when heated: ${cooling} ${forClearance}.` }
      : { id: 'thermal-assembly', status: 'fail', penalty: SCORE_POINTS.hardLimit, message: `The housing does not expand when heated and ${cooling}.` }
  }
  const heating = `Heat the housing to ≥ ${f.temperature(heatC)} ${forClearance}`
  const heatLimitC = settings.housing.maxServiceTempC
  if (heatC <= heatLimitC) {
    return { id: 'thermal-assembly', status: 'pass', penalty: 0, message: `${heating} (or ${cooling}).` }
  }
  const penalty = SCORE_POINTS.heatingPerKelvinOverLimit * (heatC - heatLimitC)
  const tooHot = `${heating}: above the ${f.temperature(heatLimitC)} service limit of ${settings.housing.name}`
  return canCool
    ? { id: 'thermal-assembly', status: 'warn', penalty, message: `${tooHot}; ${cooling} instead.` }
    : { id: 'thermal-assembly', status: 'warn', penalty, message: `${tooHot}, so check its temper accepts a short exposure (${cooling}).` }
}

function locateCheck(inServiceUm: ClearanceRangeUm, it7Um: number, f: AdvisorFormat): Check {
  const limitUm = LOCATE_MAX_CLEARANCE_IN_IT7 * it7Um
  const limit = `${f.clearance(limitUm)} (${LOCATE_MAX_CLEARANCE_IN_IT7} × IT7)`
  const penalty = SCORE_POINTS.locatePerLimit * Math.max(0, inServiceUm.maxUm - limitUm) / limitUm
  return inServiceUm.maxUm <= limitUm
    ? { id: 'locate', status: 'pass', penalty, message: `Max clearance in service ${f.clearance(inServiceUm.maxUm)} ≤ ${limit}: locates.` }
    : { id: 'locate', status: 'warn', penalty, message: `Up to ${f.clearance(inServiceUm.maxUm)} clearance in service; accurate location needs ≤ ${limit}.` }
}

function transmitTorqueCheck(c: CandidateClearances, f: AdvisorFormat): Check {
  if (c.inServiceUm.maxUm < 0) {
    return { id: 'transmit-torque', status: 'pass', penalty: 0,
      message: 'Interference at every service temperature: torque can be carried by friction.' }
  }
  const loosest = c.atServiceMax.maxUm >= c.atServiceMin.maxUm ? c.atServiceMax : c.atServiceMin
  return { id: 'transmit-torque', status: 'warn',
    penalty: SCORE_POINTS.torqueClearanceShare * clearanceShare(c.inServiceUm),
    message: `Up to ${f.clearance(loosest.maxUm)} clearance at ${f.temperature(loosest.tempC)}: carry the torque with a key, pin or spline.` }
}

function slideRotateCheck(c: CandidateClearances, f: AdvisorFormat): Check {
  if (c.inServiceUm.minUm >= 0) {
    return { id: 'slide-rotate', status: 'pass', penalty: 0, message: 'Clearance at every service temperature: free to slide or turn.' }
  }
  const tightest = c.atServiceMax.minUm <= c.atServiceMin.minUm ? c.atServiceMax : c.atServiceMin
  return { id: 'slide-rotate', status: 'fail', penalty: SCORE_POINTS.hardLimit,
    message: `Up to ${f.clearance(-tightest.minUm)} interference at ${f.temperature(tightest.tempC)}: the parts can seize.` }
}

function disassembleOftenCheck(atAssembly: ClearanceAtTemperature, f: AdvisorFormat): Check {
  const at = `at ${f.temperature(atAssembly.tempC)}`
  const penalty = SCORE_POINTS.disassemblyInterferenceShare * (1 - clearanceShare(atAssembly))
  if (atAssembly.maxUm <= 0) {
    return { id: 'disassemble-often', status: 'fail', penalty, message: `Interference fit ${at}: every disassembly needs a press or heat and wears the joint.` }
  }
  return atAssembly.minUm < 0
    ? { id: 'disassemble-often', status: 'warn', penalty, message: `Transition fit ${at}: some part pairs will need a press to separate.` }
    : { id: 'disassemble-often', status: 'pass', penalty, message: `Clearance ${at}: separates freely.` }
}

/** Share (0 … 1) of a clearance range that is clearance (> 0) rather than interference. */
function clearanceShare(range: ClearanceRangeUm): number {
  return shareInside(range, { minUm: 0, maxUm: Infinity })
}
