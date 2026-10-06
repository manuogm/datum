import { fail, ok, type Result } from '../../../core/result'
import { boltDimensions } from './boltDimensions'
import { threadEngagement, type ThreadEngagement } from './engagement'
import { boltedFormat } from './format'
import { embeddingLossN, embeddingUm, thermalPreloadLossN } from './preloadChanges'
import { boltMaterial } from './propertyClasses'
import { boltSegments, coneResilience, loadFactor } from './resilience'
import { bearingDiameterUnderWasherMm, LOAD_INTRODUCTION_FACTOR, limitingSurfacePressure, STANDARD_UTILISATION } from './rules'
import { alternatingStressMPa, fatigueLimitMPa, slipClampForceN, workingStress } from './strength'
import { annulusAreaMm2, threadGeometry, type ThreadGeometry } from './threads'
import { permissibleAssemblyPreloadN, threadTorqueNmm, tighteningFactor, tighteningTorqueNm } from './tightening'
import { buildSteps, summarise } from './trail'
import type {
  BearingPressure, BoltedJointAnalysis, BoltedJointInput, BoltGeometry, BoltStresses, JointLoads, JointMaterial, Preload, Resilience,
} from './types'
import { inputError } from './validate'

const MPA_PER_GPA = 1000

/** A layer of the clamped stack: a plate or a washer. */
export interface Layer {
  readonly name: string
  readonly thicknessMm: number
  readonly modulusMPa: number
  readonly expansionUmPerMK: number
}

/** Loads with their defaults filled in. */
export type LoadSettings = Required<Omit<JointLoads, 'frictionRadiusMm'>> & { readonly frictionRadiusMm: number }

/** Everything the calculation trail reports. */
export interface JointResults {
  readonly input: BoltedJointInput
  readonly loads: LoadSettings
  readonly geometry: BoltGeometry
  readonly layers: readonly Layer[]
  readonly resilience: Resilience
  readonly introductionFactor: number
  readonly loadFactor: number
  readonly preload: Preload
  /** FA,max used for clamp and bolt forces: a compressive working load is taken as 0 (on the safe side). */
  readonly tensileAxialMaxN: number
  readonly bearingMeanDiameterMm: number
  readonly stresses: BoltStresses
  readonly bearings: readonly BearingPressure[]
  readonly engagement: ThreadEngagement | null
}

/**
 * Bolted joint calculation to VDI 2230 Part 1:2015 for one bolt with
 * concentric clamping and loading, steps R0 … R13. Returns an explanation
 * instead of a result when the input is not usable; never throws.
 *
 * Preload: the bolt is tightened to FMmax = FMzul (ν·Rp0.2 in the thread at
 * assembly, R7), so FMmin = FMzul / αA; R5 then checks that FMmin covers the
 * preload the joint needs.
 */
export function analyseBoltedJoint(input: BoltedJointInput): Result<BoltedJointAnalysis> {
  const invalid = inputError(input)
  if (invalid) return fail(invalid)
  const thread = threadGeometry(input.thread.nominalMm, input.thread.pitchMm)
  if (!thread.ok) return thread
  const bolt = boltMaterial(input.propertyClass, thread.value.nominalMm)
  if (!bolt.ok) return bolt
  const geometry = boltGeometry(input, thread.value, bolt.value)
  if (!geometry.ok) return geometry
  const results = jointResults(input, geometry.value)
  const steps = buildSteps(results, boltedFormat(input.unitSystem ?? 'si'))
  return ok({
    geometry: results.geometry,
    resilience: results.resilience,
    loadIntroductionFactor: results.introductionFactor,
    loadFactor: results.loadFactor,
    preload: results.preload,
    stresses: results.stresses,
    bearingPressures: results.bearings,
    engagement: results.engagement,
    steps,
    summary: summarise(steps),
  })
}

function boltGeometry(input: BoltedJointInput, thread: ThreadGeometry, material: BoltGeometry['material']): Result<BoltGeometry> {
  const dimensions = boltDimensions(thread.nominalMm)
  if (!dimensions) return fail(`No head and hole dimensions are held for M${thread.nominalMm}.`)
  const through = input.joint.kind === 'through-bolt'
  const washer = input.washers ? dimensions.washer : null
  const washersMm = washer ? washer.thicknessMm * (through ? 2 : 1) : 0
  const clampLengthMm = input.plates.reduce((sum, plate) => sum + plate.thicknessMm, 0) + washersMm
  const shankLengthMm = input.shankLengthMm ?? 0
  if (shankLengthMm > clampLengthMm) return fail('The unthreaded shank cannot be longer than the clamp length lK: the thread must reach into the nut or tapped hole.')
  if (input.outerDiameterMm <= dimensions.clearanceHoleMm) {
    return fail(`The outer diameter DA of the clamped parts must be larger than the clearance hole (${dimensions.clearanceHoleMm} mm).`)
  }
  return ok({
    thread,
    material,
    headType: input.headType,
    headBearingMm: input.headType === 'hex' ? dimensions.hexBearingMm : dimensions.socketBearingMm,
    nutBearingMm: through ? dimensions.hexBearingMm : null,
    clearanceHoleMm: dimensions.clearanceHoleMm,
    washer,
    clampLengthMm,
  })
}

/** Plates in stack order, with washers (of the bolt's steel) under the head and, for a through-bolt, under the nut. */
function clampedLayers(input: BoltedJointInput, geometry: BoltGeometry): readonly Layer[] {
  const plates = input.plates.map(({ material, thicknessMm }): Layer => ({
    name: material.name, thicknessMm,
    modulusMPa: material.youngsModulusGPa * MPA_PER_GPA, expansionUmPerMK: material.thermalExpansionUmPerMK,
  }))
  if (!geometry.washer) return plates
  const washer: Layer = {
    name: 'Washer ISO 7089', thicknessMm: geometry.washer.thicknessMm,
    modulusMPa: geometry.material.youngsModulusMPa, expansionUmPerMK: geometry.material.thermalExpansionUmPerMK,
  }
  return input.joint.kind === 'through-bolt' ? [washer, ...plates, washer] : [washer, ...plates]
}

function loadSettings(input: BoltedJointInput, geometry: BoltGeometry): LoadSettings {
  const { loads } = input
  return {
    axialMaxN: loads.axialMaxN,
    axialMinN: loads.axialMinN ?? 0,
    transverseN: loads.transverseN ?? 0,
    torqueNm: loads.torqueNm ?? 0,
    // Mean radius of the bearing ring under the head: (dW + dh)/4.
    frictionRadiusMm: loads.frictionRadiusMm ?? (geometry.headBearingMm + geometry.clearanceHoleMm) / 4,
    transverseVariation: loads.transverseVariation ?? 'alternating',
    minClampForceN: loads.minClampForceN ?? 0,
  }
}

function jointResults(input: BoltedJointInput, geometry: BoltGeometry): JointResults {
  const { thread, material } = geometry
  const loads = loadSettings(input, geometry)
  const layers = clampedLayers(input, geometry)
  const resilience = jointResilience(input, geometry, layers)
  const introductionFactor = 'factor' in input.loadIntroduction
    ? input.loadIntroduction.factor : LOAD_INTRODUCTION_FACTOR[input.loadIntroduction.position]
  const phi = loadFactor(introductionFactor, resilience.boltMmPerN, resilience.platesMmPerN)
  const tensileAxialMaxN = Math.max(0, loads.axialMaxN)
  const preload = preloadResults(input, geometry, layers, resilience, loads, phi, tensileAxialMaxN)
  const working = workingStress(preload.boltForceMaxN, threadTorqueNmm(preload.assemblyMaxN, thread, input.threadFriction), thread)
  const meanBoltForceN = preload.assemblyMaxN + phi * (loads.axialMaxN + loads.axialMinN) / 2
  const pressureForceN = Math.max(preload.assemblyMaxN, preload.boltForceMaxN)
  return {
    input,
    loads,
    geometry,
    layers,
    resilience,
    introductionFactor,
    loadFactor: phi,
    preload,
    tensileAxialMaxN,
    bearingMeanDiameterMm: bearingMeanDiameterMm(geometry),
    stresses: {
      working,
      alternatingMPa: alternatingStressMPa(phi, loads.axialMaxN, loads.axialMinN, thread),
      fatigueLimitMPa: fatigueLimitMPa(thread.nominalMm, input.threadRolling ?? 'before-heat-treatment',
        meanBoltForceN, material.proofStressMPa * thread.stressAreaMm2),
    },
    bearings: bearingPressures(input, geometry, pressureForceN),
    engagement: threadEngagement(input.joint, thread, material),
  }
}

/** δS, δP and the cone (R3). The cone starts at the smaller of the head and nut bearing diameters. */
function jointResilience(input: BoltedJointInput, geometry: BoltGeometry, layers: readonly Layer[]): Resilience {
  const { joint } = input
  const segments = boltSegments({
    thread: geometry.thread,
    headType: input.headType,
    boltModulusMPa: geometry.material.youngsModulusMPa,
    clampLengthMm: geometry.clampLengthMm,
    shankLengthMm: input.shankLengthMm ?? 0,
    engaged: joint.kind === 'through-bolt'
      ? { kind: 'nut', modulusMPa: geometry.material.youngsModulusMPa }
      : { kind: 'tapped', modulusMPa: joint.material.youngsModulusGPa * MPA_PER_GPA },
  })
  const boltMmPerN = segments.reduce((sum, s) => sum + s.resilienceMmPerN, 0)
  const cone = coneResilience({
    layers,
    bearingMm: Math.min(geometry.headBearingMm, geometry.nutBearingMm ?? Infinity),
    holeMm: geometry.clearanceHoleMm,
    outerMm: input.outerDiameterMm,
    kind: joint.kind === 'through-bolt' ? 'through' : 'tapped',
  })
  return {
    boltSegments: segments,
    boltMmPerN,
    platesMmPerN: cone.totalMmPerN,
    plateShareMmPerN: cone.perLayerMmPerN,
    coneTanPhi: cone.tanPhi,
    coneAngleDeg: (Math.atan(cone.tanPhi) * 180) / Math.PI,
    coneLimitDiameterMm: cone.limitDiameterMm,
    boltStiffnessNPerMm: 1 / boltMmPerN,
    platesStiffnessNPerMm: 1 / cone.totalMmPerN,
  }
}

/** Preload chain R1, R2, R4 … R7, R13. */
function preloadResults(
  input: BoltedJointInput, geometry: BoltGeometry, layers: readonly Layer[], resilience: Resilience,
  loads: LoadSettings, phi: number, tensileAxialMaxN: number,
): Preload {
  const { thread, material } = geometry
  const { boltMmPerN, platesMmPerN } = resilience
  const alphaA = tighteningFactor(input.tightening)
  const utilisation = input.utilisation ?? STANDARD_UTILISATION

  // R2: clamp load against slip (and any other clamp requirement such as sealing).
  const transverse = loads.transverseN > 0 || loads.torqueNm > 0
  const slipN = slipClampForceN(loads.transverseN, loads.torqueNm, input.frictionInterfaces ?? 1, loads.frictionRadiusMm, input.interfaceFriction)
  const requiredClampForceN = Math.max(slipN, loads.minClampForceN)

  // R4: embedding (Table 5) and thermal preload change.
  const through = input.joint.kind === 'through-bolt'
  const fz = embeddingUm(input.surfaceRoughness, transverse ? 'transverse' : 'axial', {
    threads: input.joint.kind === 'insert' ? 2 : 1,
    bearings: through ? 2 : 1,
    interfaces: through ? layers.length - 1 : layers.length,
  })
  const embeddingN = embeddingLossN(fz, boltMmPerN, platesMmPerN)
  const assemblyTempC = input.assemblyTempC ?? 20
  const thermalAt = (tempC: number) => thermalPreloadLossN(material.thermalExpansionUmPerMK,
    layers.map((layer) => ({ thicknessMm: layer.thicknessMm, expansionUmPerMK: layer.expansionUmPerMK })),
    tempC - assemblyTempC, boltMmPerN, platesMmPerN)
  const thermal = input.serviceTempC ? [thermalAt(input.serviceTempC.minC), thermalAt(input.serviceTempC.maxC)] : [0]
  const thermalLossN = Math.max(0, ...thermal)
  const thermalGainN = Math.max(0, ...thermal.map((change) => -change))

  // R5 … R7: required and available preload.
  const assemblyMaxN = permissibleAssemblyPreloadN(thread, material.proofStressMPa, utilisation, input.threadFriction)
  const assemblyMinN = assemblyMaxN / alphaA
  const serviceMinN = assemblyMinN - embeddingN - thermalLossN
  return {
    tighteningFactor: alphaA,
    utilisation,
    embeddingUm: fz,
    embeddingLossN: embeddingN,
    thermalLossN,
    thermalGainN,
    slipClampForceN: slipN,
    requiredClampForceN,
    requiredAssemblyMinN: requiredClampForceN + (1 - phi) * tensileAxialMaxN + embeddingN + thermalLossN,
    assemblyMaxN,
    assemblyMinN,
    serviceMinN,
    residualClampMinN: serviceMinN - (1 - phi) * tensileAxialMaxN,
    separationAxialN: serviceMinN / (1 - phi),
    boltForceMaxN: assemblyMaxN + phi * tensileAxialMaxN + thermalGainN,
    tighteningTorqueNm: tighteningTorqueNm(assemblyMaxN, thread, input.threadFriction, input.headFriction, bearingMeanDiameterMm(geometry)),
  }
}

/**
 * DKm = (dW + dh)/2 (R13): mean diameter of the head bearing face. On a
 * washer the inner diameter is the washer bore, else the clearance hole.
 * The head is taken as the turned part.
 */
function bearingMeanDiameterMm(geometry: BoltGeometry): number {
  return (geometry.headBearingMm + (geometry.washer?.innerMm ?? geometry.clearanceHoleMm)) / 2
}

/** R10: pressure on the clamped part under the head and, for a through-bolt, under the nut. */
function bearingPressures(input: BoltedJointInput, geometry: BoltGeometry, forceN: number): readonly BearingPressure[] {
  const side = (name: BearingPressure['side'], bearingMm: number, material: JointMaterial): BearingPressure => {
    const outerMm = geometry.washer
      ? bearingDiameterUnderWasherMm(bearingMm, geometry.washer.outerMm, geometry.washer.thicknessMm)
      : bearingMm
    const areaMm2 = annulusAreaMm2(outerMm, geometry.clearanceHoleMm)
    return {
      side: name, material, outerMm, innerMm: geometry.clearanceHoleMm, areaMm2,
      pressureMPa: forceN / areaMm2, limit: limitingSurfacePressure(material),
    }
  }
  const head = side('head', geometry.headBearingMm, input.plates[0].material)
  return geometry.nutBearingMm === null
    ? [head]
    : [head, side('nut', geometry.nutBearingMm, input.plates[input.plates.length - 1].material)]
}
