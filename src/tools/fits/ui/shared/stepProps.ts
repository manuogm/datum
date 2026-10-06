// What every step of the Fit Tolerance tool is given: the inputs and how to
// change them, the engine results, the step flow and the faulty step (if any).
import type { Dispatch } from 'react'
import type { StepFlow } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { FitResults } from '../logic/fitResults'
import type { StepFault } from '../logic/fitSteps'
import type { FitInputs, FitMode } from '../state/fitInputs'
import type { FitAction } from '../state/fitReducer'

export interface FitStepProps {
  inputs: FitInputs
  results: FitResults
  system: UnitSystem
  dispatch: Dispatch<FitAction>
  flow: StepFlow
  fault: StepFault | null
}

/**
 * StepPage props for the step at fault: what cannot be analysed with the
 * engine's explanation above the inputs, and Next blocked with the reason.
 */
export function faultProps(fault: StepFault | null, step: StepFault['step'], title: string) {
  return fault?.step === step ? { problem: { title, detail: fault.error }, nextDisabled: true, nextNote: fault.note } : {}
}

/** The first step also holds the choice of mode. */
export interface FirstStepProps extends FitStepProps {
  onModeChange: (mode: FitMode) => void
}
