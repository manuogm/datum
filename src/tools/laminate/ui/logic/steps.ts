// The guided steps of the Composite Laminate tool: Layup · Loads · Check ·
// Results. A step is marked when the engine rejects its inputs, so the step
// bar points at what to fix. Each input step keeps its less common inputs
// under More options; the counts here say how many of those differ from
// their defaults, so a hidden setting that matters shows on the closed row.
import type { StepDef } from '../../../../app/ui'
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

/** The title of the engine's explanation on the step at fault, and of Results when it cannot run. */
export const FAULT_TITLE = 'This laminate cannot be analysed'

/** A step's name by its id, e.g. 'Layup' for 'layup'. */
export const stepLabel = (id: LamStepId): string => STEPS.find((step) => step.id === id)?.label ?? id

/** StepPage's `problem` on step `id`: the engine's explanation when the fault is there. */
export const stepProblem = (fault: StepFault | null, id: LamStepId) => (fault?.step === id ? { title: FAULT_TITLE, detail: fault.error } : null)

/**
 * The four steps, the faulty one marked. A stacking notation typed on Layup
 * that does not parse (see notationDraft) also marks Layup: the plies on
 * screen are then not the ones typed.
 */
export function lamSteps(fault: StepFault | null, notationError: string | null = null): readonly StepDef[] {
  return STEPS.map((step) => {
    const problem = step.id === 'layup' && notationError !== null ? `Stacking sequence: ${notationError}` : step.id === fault?.step ? fault.error : null
    return problem === null ? step : { ...step, invalid: problem }
  })
}

/** Beside the disabled Next on Layup while the typed notation does not parse. */
export const NOTATION_BLOCKS_NEXT = 'Complete the stacking sequence to go on'

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
