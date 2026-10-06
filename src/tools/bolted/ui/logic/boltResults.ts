// Runs the engines on the current inputs: the VDI 2230 analysis of the single
// joint, and the bolt pattern under each of its load cases. The inputs hold
// material ids; the engines take the materials themselves.
import { materialById } from '../../../../core/materials'
import { fail, ok, type Result } from '../../../../core/result'
import type { UnitSystem } from '../../../../core/units'
import { analyseBoltedJoint, type BoltedJointAnalysis, type JointDesign, type JointMaterial, type TemperatureRangeC } from '../../calc'
import { analyseBoltPattern, type BoltPatternAnalysis } from '../../pattern'
import { jointTitle } from './labels'
import type { BoltInputs, JointDesignSpec, LoadCaseSpec, PatternSpec } from '../state/boltInputs'

export interface LoadCaseResult {
  readonly loadCase: LoadCaseSpec
  readonly analysis: Result<BoltPatternAnalysis>
}

export interface BoltResults {
  readonly joint: Result<BoltedJointAnalysis>
  /** One per load case, in input order. */
  readonly loadCases: readonly LoadCaseResult[]
}

/** `system` is the unit system of the engines' messages. */
export function boltResults(inputs: BoltInputs, system: UnitSystem): BoltResults {
  return {
    joint: analyseJoint(inputs, system),
    loadCases: inputs.pattern.loadCases.map((loadCase) => ({ loadCase, analysis: analysePattern(inputs.pattern, loadCase, inputs.serviceTempC, system) })),
  }
}

export function analyseJoint({ joint, serviceTempC }: BoltInputs, system: UnitSystem): Result<BoltedJointAnalysis> {
  const design = jointDesign(joint.design, serviceTempC)
  if (!design.ok) return design
  return analyseBoltedJoint({ ...design.value, loads: joint.loads, unitSystem: system })
}

function analysePattern(pattern: PatternSpec, loadCase: LoadCaseSpec, serviceTempC: TemperatureRangeC, system: UnitSystem): Result<BoltPatternAnalysis> {
  const jointTypes = []
  for (const jointType of pattern.jointTypes) {
    const design = jointDesign(jointType.design, serviceTempC)
    const name = jointTitle(jointType.design)
    // Worded like the engine's own messages about a joint type.
    if (!design.ok) return fail(`Joint type ${jointType.id} (${name}): ${design.error}`)
    jointTypes.push({ id: jointType.id, name, design: design.value })
  }
  const { forceN, momentNm, loadPointMm } = loadCase
  return analyseBoltPattern({ jointTypes, bolts: pattern.bolts, loadCase: { forceN, momentNm, loadPointMm }, unitSystem: system })
}

/** The engine's joint design for a spec; fails when a material id is unknown. */
export function jointDesign(spec: JointDesignSpec, serviceTempC: TemperatureRangeC): Result<JointDesign> {
  const plates = []
  for (const plate of spec.plates) {
    const material = materialById(plate.materialId)
    if (!material.ok) return material
    const pG = plate.limitingPressureMPa
    plates.push({ material: pG === undefined ? material.value : { ...material.value, limitingSurfacePressureMPa: pG }, thicknessMm: plate.thicknessMm })
  }
  const joint = jointType(spec.joint)
  if (!joint.ok) return joint
  return ok({
    thread: spec.thread,
    propertyClass: spec.propertyClass,
    headType: spec.headType,
    washers: spec.washers,
    joint: joint.value,
    plates,
    outerDiameterMm: spec.outerDiameterMm,
    tightening: { method: spec.tightening },
    threadFriction: spec.threadFriction,
    headFriction: spec.headFriction,
    interfaceFriction: spec.interfaceFriction,
    frictionInterfaces: spec.frictionInterfaces,
    surfaceRoughness: spec.surfaceRoughness,
    loadIntroduction: { position: spec.loadIntroduction },
    serviceTempC,
  })
}

function jointType(spec: JointDesignSpec['joint']): Result<JointDesign['joint']> {
  if (spec.kind === 'through-bolt') return ok(spec)
  const material = materialById(spec.materialId)
  if (!material.ok) return material
  const into: JointMaterial = material.value
  if (spec.kind === 'tapped') return ok({ kind: 'tapped', material: into, engagementMm: spec.engagementMm })
  return ok({
    kind: 'insert', insert: spec.insert, material: into, engagementMm: spec.engagementMm,
    ...(spec.outerThread && { outerThread: spec.outerThread }),
  })
}

/** Ids of every material a set of joint designs uses, each once. */
export function materialIdsOf(designs: readonly JointDesignSpec[]): string[] {
  return [...new Set(designs.flatMap((d) => [...d.plates.map((p) => p.materialId), ...(d.joint.kind === 'through-bolt' ? [] : [d.joint.materialId])]))]
}
