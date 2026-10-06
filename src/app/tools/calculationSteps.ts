// The guided steps of a calculation, the same rules in every tool:
//   - where they open: a new calculation (never saved since it was created)
//     on its first step, any other (a saved one, a worked example) on Results;
//   - what the screen remembers while the page is open (the step it was on,
//     which result depths are open), all under one key per calculation, so
//     deleting the calculation forgets it all at once.
import type { Calculation } from '../../core/library'
import { forget, useStepFlow, type StepDef, type StepFlow, type StepFlowState } from '../ui'

type Dates = Pick<Calculation, 'inputs' | 'createdAt' | 'updatedAt'>

/**
 * Never saved since it was created. A seeded worked example (inputs null)
 * is a finished calculation to read, so it is not new.
 */
export function isNewCalculation(calculation: Dates): boolean {
  return calculation.inputs !== null && calculation.createdAt === calculation.updatedAt
}

/** Where a calculation's steps open when this page has not shown it yet. */
export function openingStep(calculation: Dates, stepCount: number): StepFlowState {
  const last = Math.max(0, stepCount - 1)
  return isNewCalculation(calculation) ? { current: 0, reached: 0 } : { current: last, reached: last }
}

/** The session memory key of a calculation's screen (see useStepFlow, ResultsLayout). */
export const calculationMemoryKey = (id: string): string => `calc:${id}`

/** Forget what the screen remembered of these calculations, e.g. once they are deleted. */
export function forgetCalculations(ids: Iterable<string>): void {
  for (const id of ids) forget(`${calculationMemoryKey(id)}/`)
}

/** The step flow of a calculation's tool screen: opens as `openingStep` says, remembered per calculation. */
export function useCalculationSteps(calculation: Calculation, steps: readonly StepDef[]): StepFlow {
  return useStepFlow(steps, { memoryKey: calculationMemoryKey(calculation.id), initial: openingStep(calculation, steps.length) })
}
