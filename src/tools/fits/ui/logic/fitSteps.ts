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
 * Calculator: the size is outside ISO 286, or ISO 286 does not define the
 * fit at this size (step 1); else a service range is the wrong way round (step 2).
 * Advisor: the size is outside ISO 286 (step 2), or else the requirements
 * are missing the window, or a range is the wrong way round or negative (step 3).
 */
export function stepFault(inputs: FitInputs, results: FitResults): StepFault | null {
  const sizeCovered = nominalSizeRange(inputs.nominalMm).ok
  if (inputs.mode === 'calculator') {
    const calculation = results.calculation
    if (!calculation.ok) {
      const note = sizeCovered ? 'Choose a fit ISO 286 defines at this size' : 'Enter a size ISO 286 covers'
      return { step: 'fit', error: calculation.error, note }
    }
    const serviceError = serviceRangeError(inputs)
    return serviceError === null ? null : { step: 'service', error: serviceError, note: 'Check the ranges above' }
  }
  const advice = results.advice
  if (advice.ok) return null
  if (!sizeCovered) return { step: 'size', error: advice.error, note: 'Enter a size ISO 286 covers' }
  const note = inputs.requiredClearanceUm === null ? 'Enter the clearance needed in service' : 'Check the ranges above'
  return { step: 'requirements', error: advice.error, note }
}

/**
 * Why the calculator cannot check the fit in service, or null: the service
 * temperatures or the required window (when one is set) are the wrong way
 * round. The same rules, in the same words, as the advisor's.
 */
export function serviceRangeError({ serviceTempC, requiredClearanceUm: window }: FitInputs): string | null {
  if (serviceTempC.minC > serviceTempC.maxC) return 'The service temperature range must go from the lower to the higher temperature.'
  if (window !== null && window.minUm >= window.maxUm) {
    return 'The required clearance window must go from a smaller to a larger clearance (negative values are interference).'
  }
  return null
}

/** The steps of the inputs' mode, the faulty one marked. */
export function fitSteps(inputs: FitInputs, fault: StepFault | null): readonly StepDef[] {
  const steps = inputs.mode === 'calculator' ? CALCULATOR_STEPS : ADVISOR_STEPS
  return steps.map((step) => (step.id === fault?.step ? { ...step, invalid: fault.error } : step))
}

