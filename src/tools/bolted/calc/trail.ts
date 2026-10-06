import type { JointResults } from './analyseJoint'
import { formatDecimal } from '../../../core/units'
import type { BoltedFormat } from './format'
import { checkStatus, REQUIRED_SAFETY, STANDARD_UTILISATION, TIGHTENING_METHODS, TORSION_REDUCTION } from './rules'
import type {
  BearingPressure, CalculationStep, JointSummary, StepCheck, StepId, StepStatus, TrailUnit, TrailValue,
} from './types'

/**
 * The calculation trail: one step per VDI 2230-1:2015 calculation step
 * R0 … R13, each with its intermediate values, its check (value, limit,
 * safety factor) and a plain-English message, for the results panel and the
 * PDF report.
 */

const VDI = 'VDI 2230-1:2015'

const value = (symbol: string, label: string, amount: number, unit: TrailUnit): TrailValue => ({ symbol, label, value: amount, unit })

/**
 * A check whose safety factor is capacity / demand. With no capacity left
 * (e.g. FKR,min ≤ 0: no clamp load at all) the safety factor is ≤ 0 and the
 * utilisation infinite, so such a check always governs.
 */
function check(demand: TrailValue, capacity: TrailValue, required: number): StepCheck {
  const safetyFactor = capacity.value / demand.value
  const utilisation = safetyFactor > 0 ? required / safetyFactor : Number.POSITIVE_INFINITY
  return { value: demand, limit: capacity, safetyFactor, requiredSafetyFactor: required, utilisation }
}

interface StepText {
  readonly id: StepId
  readonly rStep: string
  readonly title: string
  readonly clause: string
}

function step(text: StepText, values: readonly TrailValue[], message: string, stepCheck: StepCheck | null = null, status?: StepStatus): CalculationStep {
  return {
    ...text, values, check: stepCheck, message,
    status: status ?? (stepCheck ? checkStatus(stepCheck.safetyFactor, stepCheck.requiredSafetyFactor) : 'info'),
  }
}

/** A result that relies on an estimate is never better than 'warn'. */
const atBestWarn = (status: StepStatus): StepStatus => (status === 'pass' ? 'warn' : status)

export function buildSteps(r: JointResults, f: BoltedFormat): readonly CalculationStep[] {
  return [
    geometryStep(r, f), tighteningFactorStep(r, f), requiredClampStep(r, f), loadFactorStep(r, f),
    preloadChangesStep(r, f), minimumPreloadStep(r, f), separationStep(r, f), preloadRangeStep(r, f),
    assemblyStressStep(r, f), workingStressStep(r, f), alternatingStressStep(r, f), surfacePressureStep(r, f),
    engagementStep(r, f), slipStep(r, f), tighteningTorqueStep(r, f),
  ]
}

function geometryStep({ geometry: g, input }: JointResults, f: BoltedFormat): CalculationStep {
  const t = g.thread
  const head = g.headType === 'hex' ? 'hexagon head (ISO 4014)' : 'socket head (ISO 4762)'
  const joint = { 'through-bolt': 'through-bolt with nut', tapped: 'tapped thread', insert: 'thread insert' }[input.joint.kind]
  return step(
    { id: 'geometry', rStep: 'R0', title: 'Bolt and joint geometry', clause: `${VDI} R0; ISO 724, ISO 898-1, ISO 273 medium, ISO 4014/4032/4762, ISO 7089` },
    [
      value('d', 'Nominal diameter', t.nominalMm, 'mm'), value('P', 'Pitch', t.pitchMm, 'mm'),
      value('d2', 'Pitch diameter', t.pitchDiameterMm, 'mm'), value('d3', 'Minor diameter', t.boltMinorDiameterMm, 'mm'),
      value('As', 'Stress area', t.stressAreaMm2, 'mm²'), value('dW', 'Head bearing diameter', g.headBearingMm, 'mm'),
      value('dh', 'Clearance hole', g.clearanceHoleMm, 'mm'), value('lK', 'Clamp length', g.clampLengthMm, 'mm'),
    ],
    `${t.designation} ${g.material.propertyClass} ${head}, ${joint}: Rp0.2 ${f.stress(g.material.proofStressMPa)}, `
    + `Rm ${f.stress(g.material.tensileStrengthMPa)} (${g.material.standard}); clamp length lK = ${f.length(g.clampLengthMm)}`
    + `${g.washer ? ' including ISO 7089 washers' : ''}.`,
  )
}

function tighteningFactorStep({ input, preload }: JointResults, f: BoltedFormat): CalculationStep {
  const method = 'method' in input.tightening ? TIGHTENING_METHODS[input.tightening.method] : null
  return step(
    { id: 'tightening-factor', rStep: 'R1', title: 'Tightening factor', clause: `${VDI} R1, Table A8` },
    [value('αA', 'Tightening factor', preload.tighteningFactor, '')],
    method
      ? `${method.description}: αA = ${f.ratio(method.factor)} (Table A8 range ${method.range}).`
      : `Tightening factor αA = ${f.ratio(preload.tighteningFactor)} as given.`,
  )
}

function requiredClampStep({ input, loads, preload }: JointResults, f: BoltedFormat): CalculationStep {
  const qF = input.frictionInterfaces ?? 1
  const slip = preload.slipClampForceN > 0
    ? `against slip FKQerf = (FQ + MY/ra) / (qF·µT) = ${f.force(preload.slipClampForceN)}` : 'no transverse load'
  const other = loads.minClampForceN > 0 ? `; other clamp requirement ${f.force(loads.minClampForceN)}` : ''
  return step(
    { id: 'required-clamp-load', rStep: 'R2', title: 'Required clamp load', clause: `${VDI} R2` },
    [
      value('FQ', 'Transverse load', loads.transverseN, 'N'), value('MY', 'Torque about bolt axis', loads.torqueNm, 'N·m'),
      value('qF', 'Friction interfaces', qF, ''), value('µT', 'Interface friction', input.interfaceFriction, ''),
      value('FKQerf', 'Clamp load against slip', preload.slipClampForceN, 'N'),
      value('FKerf', 'Required clamp load', preload.requiredClampForceN, 'N'),
    ],
    `FKerf = ${f.force(preload.requiredClampForceN)}: ${slip}${other}.`,
  )
}

function loadFactorStep({ resilience: s, introductionFactor, loadFactor, input }: JointResults, f: BoltedFormat): CalculationStep {
  const cone = input.outerDiameterMm >= s.coneLimitDiameterMm ? 'full cone' : 'cone and sleeve'
  return step(
    { id: 'load-factor', rStep: 'R3', title: 'Resilience and load factor', clause: `${VDI} R3, §5.1.1 (bolt), §5.1.2.2 (deformation cone), §5.2.2` },
    [
      ...s.boltSegments.map((segment) => value(`δ ${segment.name.toLowerCase()}`, segment.name, segment.resilienceMmPerN, 'mm/N')),
      value('δS', 'Bolt resilience', s.boltMmPerN, 'mm/N'),
      value('φ', 'Cone angle', s.coneAngleDeg, '°'), value('DA,Gr', 'Limit diameter of the cone', s.coneLimitDiameterMm, 'mm'),
      value('δP', 'Resilience of the clamped parts', s.platesMmPerN, 'mm/N'),
      value('cS', 'Bolt stiffness', s.boltStiffnessNPerMm, 'N/mm'), value('cP', 'Stiffness of the clamped parts', s.platesStiffnessNPerMm, 'N/mm'),
      value('n', 'Load introduction factor', introductionFactor, ''), value('Φn', 'Load factor', loadFactor, ''),
    ],
    `The clamped parts are ${f.ratio(s.boltMmPerN / s.platesMmPerN)} times as stiff as the bolt (${cone}, φ = ${s.coneAngleDeg.toFixed(1)}°). `
    + `With n = ${f.ratio(introductionFactor)} the bolt takes Φn = n·δP/(δS + δP) = ${f.ratio(loadFactor)} of the axial load.`,
  )
}

function preloadChangesStep({ preload: p, input }: JointResults, f: BoltedFormat): CalculationStep {
  const thermal = input.serviceTempC
    ? ` Over ${f.temperatureRange(input.serviceTempC.minC, input.serviceTempC.maxC)}: up to ${f.force(p.thermalLossN)} lost, up to ${f.force(p.thermalGainN)} gained.`
    : ''
  return step(
    { id: 'preload-changes', rStep: 'R4', title: 'Preload changes', clause: `${VDI} R4, §5.4.2.1 Table 5 (embedding), §5.4.2.3 (temperature)` },
    [
      value('fZ', 'Plastic embedding', p.embeddingUm, 'µm'), value('FZ', 'Preload loss from embedding', p.embeddingLossN, 'N'),
      value('ΔFVth,gain', 'Preload gain from temperature', p.thermalGainN, 'N'), value('ΔFVth', 'Preload loss from temperature', p.thermalLossN, 'N'),
      // Last, as the step's headline: what R5 adds to the required preload.
      value('FZ + ΔFVth', 'Total preload loss in service', p.embeddingLossN + p.thermalLossN, 'N'),
    ],
    `Embedding of ${f.embedding(p.embeddingUm)} costs FZ = fZ/(δS + δP) = ${f.force(p.embeddingLossN)}.${thermal}`,
  )
}

function minimumPreloadStep({ preload: p }: JointResults, f: BoltedFormat): CalculationStep {
  const stepCheck = check(value('FMerf', 'Required minimum preload', p.requiredAssemblyMinN, 'N'),
    value('FMmin', 'Minimum assembly preload', p.assemblyMinN, 'N'), REQUIRED_SAFETY.minimumPreload)
  const compared = `FMmin = ${f.force(p.assemblyMinN)} against FMerf = FKerf + (1 − Φn)·FA,max + FZ + ΔFVth = ${f.force(p.requiredAssemblyMinN)}`
  return step(
    { id: 'minimum-preload', rStep: 'R5', title: 'Minimum assembly preload', clause: `${VDI} R5` },
    [stepCheck.value, stepCheck.limit],
    stepCheck.safetyFactor >= 1
      ? `${compared}: the lowest preload covers the clamp load the joint needs.`
      : `${compared}: the lowest preload is too small. Use a larger or stronger bolt or a more precise tightening method.`,
    stepCheck,
  )
}

function separationStep({ preload: p, loads, tensileAxialMaxN }: JointResults, f: BoltedFormat): CalculationStep {
  const text: StepText = { id: 'separation', rStep: 'R5', title: 'Safety against separation', clause: `${VDI} R5 (FKR,min ≥ 0); SK = FA,sep / FA,max` }
  const values = [value('FV,min', 'Lowest preload in service', p.serviceMinN, 'N'), value('FA,sep', 'Axial load at separation', p.separationAxialN, 'N')]
  if (tensileAxialMaxN === 0) return step(text, values, 'No tensile axial load: the joint cannot open.')
  const stepCheck = check(value('FA,max', 'Largest axial load', loads.axialMaxN, 'N'), values[1], REQUIRED_SAFETY.separation)
  return step(text, [...values, stepCheck.value], stepCheck.safetyFactor >= 1
    ? `The parts separate at FA = FV,min/(1 − Φn) = ${f.force(p.separationAxialN)}, SK = ${f.ratio(stepCheck.safetyFactor)} × FA,max.`
    : `The parts separate at FA = ${f.force(Math.max(0, p.separationAxialN))}, below FA,max = ${f.force(loads.axialMaxN)}: the joint opens in service.`,
  stepCheck)
}

function preloadRangeStep({ preload: p }: JointResults, f: BoltedFormat): CalculationStep {
  return step(
    { id: 'preload-range', rStep: 'R6', title: 'Preload range', clause: `${VDI} R6` },
    [value('FMmin', 'Minimum assembly preload', p.assemblyMinN, 'N'), value('FMmax', 'Maximum assembly preload', p.assemblyMaxN, 'N')],
    `Tightened to FMmax = FMzul = ${f.force(p.assemblyMaxN)}, the preload scatters down to FMmin = FMmax/αA = ${f.force(p.assemblyMinN)}.`,
  )
}

function assemblyStressStep({ preload: p, geometry: g, input }: JointResults, f: BoltedFormat): CalculationStep {
  const rp = g.material.proofStressMPa
  const stepCheck = check(value('σred,M', 'Equivalent stress at assembly', p.utilisation * rp, 'MPa'),
    value('Rp0.2', 'Minimum proof stress', rp, 'MPa'), 1)
  const status: StepStatus = p.utilisation <= STANDARD_UTILISATION ? 'pass' : 'warn'
  return step(
    { id: 'assembly-stress', rStep: 'R7', title: 'Assembly stress and permissible preload', clause: `${VDI} R7, eq. (5.5/1–2)` },
    [value('µG', 'Thread friction', input.threadFriction, ''), value('ν', 'Utilisation of Rp0.2', p.utilisation, ''),
      value('FMzul', 'Permissible assembly preload', p.assemblyMaxN, 'N'), stepCheck.value, stepCheck.limit],
    `At ν = ${Math.round(p.utilisation * 100)} % of Rp0.2 (σred,M = ${f.stress(stepCheck.value.value)}) and µG = ${f.ratio(input.threadFriction)}, `
    + `FMzul = ${f.force(p.assemblyMaxN)}.${status === 'warn' ? ` VDI 2230 recommends ν ≤ ${STANDARD_UTILISATION}.` : ''}`,
    stepCheck, status,
  )
}

function workingStressStep({ preload: p, stresses: { working: w }, geometry: g }: JointResults, f: BoltedFormat): CalculationStep {
  const stepCheck = check(value('σred,B', 'Equivalent stress in service', w.reducedMPa, 'MPa'),
    value('Rp0.2', 'Minimum proof stress', g.material.proofStressMPa, 'MPa'), REQUIRED_SAFETY.workingStress)
  return step(
    { id: 'working-stress', rStep: 'R8', title: 'Working stress', clause: `${VDI} R8, kτ = ${TORSION_REDUCTION}` },
    [value('FSmax', 'Largest bolt force', p.boltForceMaxN, 'N'), value('σz', 'Axial stress', w.axialMPa, 'MPa'),
      value('kτ·τ', 'Remaining torsional stress', w.torsionMPa, 'MPa'), stepCheck.value, stepCheck.limit],
    `FSmax = FMzul + Φn·FA,max${p.thermalGainN > 0 ? ' + thermal gain' : ''} = ${f.force(p.boltForceMaxN)} gives σred,B = ${f.stress(w.reducedMPa)}, `
    + `SF = Rp0.2/σred,B = ${f.ratio(stepCheck.safetyFactor)}${stepCheck.safetyFactor >= 1 ? '' : ': the bolt yields in service'}.`,
    stepCheck,
  )
}

function alternatingStressStep({ input, stresses, geometry }: JointResults, f: BoltedFormat): CalculationStep {
  const rolledAfter = input.threadRolling === 'after-heat-treatment'
  const limitSymbol = rolledAfter ? 'σASG' : 'σASV'
  const text: StepText = { id: 'alternating-stress', rStep: 'R9', title: 'Alternating stress (fatigue)', clause: `${VDI} R9, ${limitSymbol}` }
  const limit = value(limitSymbol, `Endurance limit, thread rolled ${rolledAfter ? 'after' : 'before'} heat treatment`, stresses.fatigueLimitMPa, 'MPa')
  if (stresses.alternatingMPa <= 0) return step(text, [limit], 'Static axial load: no alternating stress in the bolt.')
  const stepCheck = check(value('σa', 'Stress amplitude', stresses.alternatingMPa, 'MPa'), limit, REQUIRED_SAFETY.alternatingStress)
  const status = checkStatus(stepCheck.safetyFactor, stepCheck.requiredSafetyFactor)
  const stainless = geometry.material.stainless
  return step(text, [stepCheck.value, limit],
    `σa = Φn·(FA,max − FA,min)/(2·As) = ${f.stress(stresses.alternatingMPa)} against ${limitSymbol} = ${f.stress(stresses.fatigueLimitMPa)}: `
    + `SD = ${f.ratio(stepCheck.safetyFactor)} (required ${REQUIRED_SAFETY.alternatingStress}).`
    + (stainless ? ' The VDI 2230 endurance limit is for ISO 898-1 steel bolts; for stainless bolts it is only an estimate.' : ''),
    stepCheck, stainless ? atBestWarn(status) : status)
}

function surfacePressureStep({ bearings }: JointResults, f: BoltedFormat): CalculationStep {
  const text: StepText = { id: 'surface-pressure', rStep: 'R10', title: 'Surface pressure under head and nut', clause: `${VDI} R10, Table A9` }
  const values = bearings.flatMap((b) => [
    value(`p ${b.side}`, `Pressure under the ${b.side} on ${b.material.name}`, b.pressureMPa, 'MPa'),
    ...(b.limit ? [value(`pG ${b.side}`, `Limiting pressure of ${b.material.name}`, b.limit.valueMPa, 'MPa')] : []),
  ])
  const unknown = bearings.find((b) => b.limit === null)
  if (unknown) {
    return step(text, values, `No limiting surface pressure pG is known for ${unknown.material.name}: enter it to check the pressure of ${f.stress(unknown.pressureMPa)}.`, null, 'warn')
  }
  const sideCheck = (b: BearingPressure) => check(value('pmax', `Pressure under the ${b.side}`, b.pressureMPa, 'MPa'),
    value('pG', `Limiting pressure of ${b.material.name}`, b.limit?.valueMPa ?? 0, 'MPa'), REQUIRED_SAFETY.surfacePressure)
  const worst = bearings.reduce((a, b) => (sideCheck(b).safetyFactor < sideCheck(a).safetyFactor ? b : a))
  const stepCheck = sideCheck(worst)
  const estimatedOn = bearings.filter((b) => b.limit?.source === 'estimate').map((b) => b.material.name)
  const estimated = estimatedOn.length > 0
  const status = checkStatus(stepCheck.safetyFactor, stepCheck.requiredSafetyFactor)
  return step(text, values,
    `Under the ${worst.side}, pmax = ${f.stress(worst.pressureMPa)} on ${worst.material.name} (pG = ${f.stress(stepCheck.limit.value)}): `
    + `SP = ${f.ratio(stepCheck.safetyFactor)}${stepCheck.safetyFactor < 1 ? ', the part will be crushed: add a washer or use a larger head' : ''}.`
    + (estimated ? ` pG of ${[...new Set(estimatedOn)].join(' and ')} estimated as Rm: enter the value to confirm.` : ''),
    stepCheck, estimated ? atBestWarn(status) : status)
}

function engagementStep({ engagement: e, input }: JointResults, f: BoltedFormat): CalculationStep {
  const text: StepText = { id: 'engagement', rStep: 'R11', title: 'Length of thread engagement', clause: `${VDI} R11, §5.5.5 (simplified)` }
  if (input.joint.kind === 'through-bolt') {
    return step(text, [], 'Through-bolt with an ISO 4032 nut of the matching property class (ISO 898-2): the bolt breaks before the threads strip.')
  }
  if (!e) return step(text, [], 'The shear strength of the tapped part is not known: thread engagement is not checked.', null, 'warn')
  const stepCheck = check(value('meff,min', 'Minimum engagement', e.requiredMm, 'mm'), value('meff', 'Engagement length', e.actualMm, 'mm'), REQUIRED_SAFETY.engagement)
  const outer = e.outerThread ? ` (M${formatDecimal(e.outerThread.nominalMm, 2)}×${e.outerThread.pitchMm})` : ''
  return step(text, [stepCheck.value, stepCheck.limit],
    `meff = ${f.length(e.actualMm)} against meff,min = ${f.length(e.requiredMm)}, set by the ${e.governing}${outer}: `
    + (stepCheck.safetyFactor >= 1 ? 'the bolt breaks before the thread strips.' : 'the thread strips before the bolt breaks; engage deeper.'),
    stepCheck)
}

function slipStep({ preload: p, loads }: JointResults, f: BoltedFormat): CalculationStep {
  const text: StepText = { id: 'slip', rStep: 'R12', title: 'Safety against slipping', clause: `${VDI} R12, eq. (R12/1)` }
  const residual = value('FKR,min', 'Residual clamp load', p.residualClampMinN, 'N')
  if (p.slipClampForceN === 0) return step(text, [residual], 'No transverse load or torque: no slip check needed.')
  const required = loads.transverseVariation === 'static' ? REQUIRED_SAFETY.slipStatic : REQUIRED_SAFETY.slipAlternating
  const stepCheck = check(value('FKQerf', 'Clamp load against slip', p.slipClampForceN, 'N'), residual, required)
  const verdict = stepCheck.safetyFactor >= required ? '' : stepCheck.safetyFactor >= 1 ? ': slip margin low' : ': the joint slips'
  return step(text, [residual, stepCheck.value],
    `SG = FKR,min/FKQerf = ${f.force(p.residualClampMinN)} / ${f.force(p.slipClampForceN)} = ${f.ratio(stepCheck.safetyFactor)}, `
    + `target ≥ ${required} for ${loads.transverseVariation} load${verdict}.`,
    stepCheck)
}

function tighteningTorqueStep({ preload: p, input, bearingMeanDiameterMm }: JointResults, f: BoltedFormat): CalculationStep {
  return step(
    { id: 'tightening-torque', rStep: 'R13', title: 'Tightening torque', clause: `${VDI} R13` },
    [value('µK', 'Head friction', input.headFriction, ''), value('DKm', 'Mean bearing diameter', bearingMeanDiameterMm, 'mm'),
      value('MA', 'Tightening torque', p.tighteningTorqueNm, 'N·m')],
    `Tighten to MA = ${f.torque(p.tighteningTorqueNm)} (µG = ${f.ratio(input.threadFriction)}, µK = ${f.ratio(input.headFriction)}) `
    + `for FMzul = ${f.force(p.assemblyMaxN)}.`,
  )
}

const SEVERITY: Readonly<Record<StepStatus, number>> = { info: 0, pass: 1, warn: 2, fail: 3 }

/** Counts the checks and finds the worst status and the governing (most utilised) check. */
export function summarise(steps: readonly CalculationStep[]): JointSummary {
  const checks = steps.filter((s) => s.status !== 'info')
  const worst = checks.reduce<StepStatus>((a, s) => (SEVERITY[s.status] > SEVERITY[a] ? s.status : a), 'pass')
  // The assembly stress is set by the chosen ν, not by the load, so it does not govern.
  const governing = steps
    .filter((s) => s.check !== null && s.id !== 'assembly-stress')
    .reduce<CalculationStep | null>((most, s) => (most === null || (s.check?.utilisation ?? 0) > (most.check?.utilisation ?? 0) ? s : most), null)
  return {
    status: worst === 'info' ? 'pass' : worst,
    checksPassed: checks.filter((s) => s.status === 'pass').length,
    checksTotal: checks.length,
    governing: governing?.id ?? null,
    utilisation: governing?.check?.utilisation ?? 0,
  }
}
