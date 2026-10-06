// The guided steps of the Fit Tolerance tool. The mode chosen on the first
// step sets the steps that follow:
//   calculator: Size & fit · Service · Results
//   advisor:    Application · Size & materials · Requirements · Results
// A step is marked when the engine rejects its inputs, so the step bar
// points at what to fix.
import type { StepDef } from '../../../../app/ui'
import { nominalSizeRange } from '../../calc'
import type { FitInputs } from '../state/fitInputs'
import type { FitResults } from './fitResults'

export type CalculatorStepId = 'fit' | 'service' | 'results'
export type AdvisorStepId = 'application' | 'size' | 'requirements' | 'results'
export type FitStepId = CalculatorStepId | AdvisorStepId

const CALCULATOR_STEPS: readonly { id: CalculatorStepId; label: string }[] = [
  { id: 'fit', label: 'Size & fit' },
  { id: 'service', label: 'Service' },
  { id: 'results', label: 'Results' },
]

const ADVISOR_STEPS: readonly { id: AdvisorStepId; label: string }[] = [
  { id: 'application', label: 'Application' },
  { id: 'size', label: 'Size & materials' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'results', label: 'Results' },
]

/** The step whose inputs the engine rejects, with the engine's explanation and a short note for the Next button. */
export interface StepFault {
  readonly step: FitStepId
  readonly error: string
  readonly note: string
}

/**
 * Where the current inputs go wrong, or null when the mode's engine runs.
 * Calculator: ISO 286 does not define the fit at this size (step 1).
 * Advisor: the size is outside ISO 286 (step 2), or else a range of the
 * requirements is the wrong way round or negative (step 3).
 */
export function stepFault(inputs: FitInputs, results: FitResults): StepFault | null {
  if (inputs.mode === 'calculator') {
    const calculation = results.calculation
    return calculation.ok ? null : { step: 'fit', error: calculation.error, note: 'Choose a fit ISO 286 defines at this size' }
  }
  const advice = results.advice
  if (advice.ok) return null
  return nominalSizeRange(inputs.nominalMm).ok
    ? { step: 'requirements', error: advice.error, note: 'Check the ranges above' }
    : { step: 'size', error: advice.error, note: 'Enter a size ISO 286 covers' }
}

/** The steps of the inputs' mode, the faulty one marked. */
export function fitSteps(inputs: FitInputs, fault: StepFault | null): readonly StepDef[] {
  const steps = inputs.mode === 'calculator' ? CALCULATOR_STEPS : ADVISOR_STEPS
  return steps.map((step) => (step.id === fault?.step ? { ...step, invalid: fault.error } : step))
}

