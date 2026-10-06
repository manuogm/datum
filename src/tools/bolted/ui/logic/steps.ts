// The guided steps of the Bolted Joint tool in each mode, and which step an
// input problem belongs to, so the step bar can mark it and the results can
// send the engineer back to it.
//
// The engines only say what is wrong, not where it was entered, so the step
// is found by elimination: if the joint can be analysed without its loads,
// the loads are at fault; if it can with the default tightening and
// friction, the Bolt step is; otherwise the joint and its clamped parts.
import type { StepDef } from '../../../../app/ui'
import type { Result } from '../../../../core/result'
import type { UnitSystem } from '../../../../core/units'
import { analyseBoltedJoint, type BoltedJointAnalysis, type TemperatureRangeC } from '../../calc'
import { DEFAULT_JOINT_DESIGN, type BoltInputs, type BoltMode, type JointDesignSpec } from '../state/boltInputs'
import { analyseJoint, jointDesign, type LoadCaseResult } from './boltResults'

const JOINT_STEPS: readonly StepDef[] = [
  { id: 'bolt', label: 'Bolt' },
  { id: 'joint', label: 'Joint' },
  { id: 'loads', label: 'Loads' },
  { id: 'results', label: 'Results' },
]

const PATTERN_STEPS: readonly StepDef[] = [
  { id: 'types', label: 'Joint types' },
  { id: 'bolts', label: 'Bolts' },
  { id: 'load-cases', label: 'Load cases' },
  { id: 'results', label: 'Results' },
]

/** A step's name by its id, e.g. 'Joint' for 'joint'. */
export function stepLabel(mode: BoltMode, id: string): string {
  return (mode === 'joint' ? JOINT_STEPS : PATTERN_STEPS).find((step) => step.id === id)?.label ?? id
}

/** An input problem: the engine's explanation and the id of the step to fix it in. */
export interface StepFault {
  readonly step: string
  readonly error: string
}

/** The mode's steps, the one at fault marked with the engine's explanation. */
export function boltSteps(mode: BoltMode, fault: StepFault | null): readonly StepDef[] {
  const steps = mode === 'joint' ? JOINT_STEPS : PATTERN_STEPS
  return fault ? steps.map((step) => (step.id === fault.step ? { ...step, invalid: fault.error } : step)) : steps
}

/** No loads, at room temperature: what is left to fail is the design. */
const UNLOADED = { axialMaxN: 0, axialMinN: 0, transverseN: 0, transverseVariation: 'static' } as const
const ROOM: TemperatureRangeC = { minC: 20, maxC: 20 }

/** The Bolt step's More options, at their defaults. */
const DEFAULT_TIGHTENING: Partial<JointDesignSpec> = {
  washers: DEFAULT_JOINT_DESIGN.washers,
  tightening: DEFAULT_JOINT_DESIGN.tightening,
  threadFriction: DEFAULT_JOINT_DESIGN.threadFriction,
  headFriction: DEFAULT_JOINT_DESIGN.headFriction,
  interfaceFriction: DEFAULT_JOINT_DESIGN.interfaceFriction,
  frictionInterfaces: DEFAULT_JOINT_DESIGN.frictionInterfaces,
}

/** The single joint's input problem, or null when it can be analysed. */
export function jointFault(inputs: BoltInputs, analysis: Result<BoltedJointAnalysis>, system: UnitSystem): StepFault | null {
  if (analysis.ok) return null
  const { error } = analysis
  const unloaded: BoltInputs = { ...inputs, serviceTempC: ROOM, joint: { ...inputs.joint, loads: UNLOADED } }
  if (analyseJoint(unloaded, system).ok) return { step: 'loads', error }
  const tightened: BoltInputs = { ...unloaded, joint: { ...unloaded.joint, design: { ...unloaded.joint.design, ...DEFAULT_TIGHTENING } } }
  return { step: analyseJoint(tightened, system).ok ? 'bolt' : 'joint', error }
}

/**
 * The pattern's first input problem, or null when every load case can be
 * analysed: a joint type that cannot be analysed on its own, else the
 * first load case that cannot (its loads, or the service temperature).
 */
export function patternFault(inputs: BoltInputs, loadCases: readonly LoadCaseResult[], system: UnitSystem): StepFault | null {
  for (const { id, design } of inputs.pattern.jointTypes) {
    const error = designError(design, system)
    if (error !== null) return { step: 'types', error: `Joint type ${id}: ${error}` }
  }
  const failing = loadCases.find((c) => !c.analysis.ok)
  if (!failing || failing.analysis.ok) return null
  return { step: 'load-cases', error: `${failing.loadCase.id} ${failing.loadCase.name}: ${failing.analysis.error}` }
}

function designError(spec: JointDesignSpec, system: UnitSystem): string | null {
  const design = jointDesign(spec, ROOM)
  if (!design.ok) return design.error
  const analysis = analyseBoltedJoint({ ...design.value, loads: UNLOADED, unitSystem: system })
  return analysis.ok ? null : analysis.error
}
