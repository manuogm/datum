// The guided steps of the Composite Laminate tool: Layup · Loads · Check ·
// Results. A step is marked when the engine rejects its inputs, so the step
// bar points at what to fix. Each input step keeps its less common inputs
// under More options; the counts here say how many of those differ from
// their defaults, so a hidden setting that matters shows on the closed row.
import type { StepDef, StepFlowState } from '../../../../app/ui'
import type { Calculation } from '../../../../core/library'
import type { Result } from '../../../../core/result'
import type { LaminateAnalysis } from '../../calc'
import { DEFAULT_LAMINATE_INPUTS, type LaminateInputs, type LoadSpec, type PlySpec } from '../state/lamInputs'
import { LOAD_COMPONENTS } from './loads'

export type LamStepId = 'layup' | 'loads' | 'check' | 'results'

const STEPS: readonly { id: LamStepId; label: string }[] = [
  { id: 'layup', label: 'Layup' },
  { id: 'loads', label: 'Loads' },
  { id: 'check', label: 'Check' },
  { id: 'results', label: 'Results' },
]

/** The step whose inputs the engine rejects, with the engine's explanation. */
export interface StepFault {
  readonly step: LamStepId
  readonly error: string
}

/**
 * Where the inputs go wrong, or null when the analysis runs. The engine
 * checks the plies, then the loads, then the target; the screens only let a
 * positive target and finite loads through, so in practice it is a ply
 * without ply data (a stored calculation from before a material changed).
 */
export function stepFault(inputs: LaminateInputs, analysis: Result<LaminateAnalysis>): StepFault | null {
  if (analysis.ok) return null
  const loadsOk = Object.values(inputs.loads).every(Number.isFinite)
  const step: LamStepId = !loadsOk ? 'loads' : inputs.targetReserveFactor > 0 ? 'layup' : 'check'
  return { step, error: analysis.error }
}

/** The four steps, the faulty one marked. */
export function lamSteps(fault: StepFault | null): readonly StepDef[] {
  return STEPS.map((step) => (step.id === fault?.step ? { ...step, invalid: fault.error } : step))
}

/**
 * Where a calculation opens when this page has not shown it yet: a new one
 * (never saved since it was created) on the first step, any other (a saved
 * calculation, an example) on its results.
 */
export function initialStep(calculation: Pick<Calculation, 'inputs' | 'createdAt' | 'updatedAt'>, stepCount: number): StepFlowState {
  const isNew = calculation.inputs !== null && calculation.createdAt === calculation.updatedAt
  const last = stepCount - 1
  return isNew ? { current: 0, reached: 0 } : { current: last, reached: last }
}

/** Layup, "Edit plies one by one": the plies not of the top ply's material (a hybrid stack). */
export function mixedPlies(plies: readonly PlySpec[]): number {
  return plies.filter((ply) => ply.materialId !== plies[0].materialId).length
}

/** Loads, "Moments": how many of Mx, My, Mxy are applied. */
export function appliedMoments(loads: LoadSpec): number {
  return LOAD_COMPONENTS.filter((c) => c.quantity === 'lineMoment' && loads[c.key] !== 0).length
}

/** Check, "More options": 1 when the failure criterion is not the default one. */
export const criterionChanged = (inputs: Pick<LaminateInputs, 'criterion'>): number => (inputs.criterion === DEFAULT_LAMINATE_INPUTS.criterion ? 0 : 1)
