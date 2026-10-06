import { describe, expect, it } from 'vitest'
import { DEFAULT_FIT_INPUTS, type FitInputs } from '../state/fitInputs'
import { fitResults } from './fitResults'
import { fitSteps, stepFault } from './fitSteps'

const calculator: FitInputs = { ...DEFAULT_FIT_INPUTS, mode: 'calculator' }
const fault = (inputs: FitInputs) => stepFault(inputs, fitResults(inputs, 'si'))

describe('fitSteps', () => {
  it('follows the mode chosen on the first step', () => {
    expect(fitSteps(calculator, null).map((s) => s.label)).toEqual(['Size & fit', 'Service', 'Results'])
    expect(fitSteps(DEFAULT_FIT_INPUTS, null).map((s) => s.label)).toEqual(['Application', 'Size & materials', 'Requirements', 'Results'])
  })

  it('marks the step whose inputs the engine rejects, with its explanation', () => {
    const undefinedFit: FitInputs = { ...calculator, nominalMm: 5000 }
    const found = fault(undefinedFit)
    expect(found?.step).toBe('fit')
    expect(fitSteps(undefinedFit, found)[0].invalid).toBe(found?.error)
    expect(fitSteps(undefinedFit, found)[1].invalid).toBeUndefined()
  })
})

describe('stepFault', () => {
  it('is null when the engine runs', () => {
    expect(fault(DEFAULT_FIT_INPUTS)).toBeNull()
    expect(fault(calculator)).toBeNull()
  })

  it('blames the size step for a size outside ISO 286, else the requirements', () => {
    expect(fault({ ...DEFAULT_FIT_INPUTS, nominalMm: 5000 })?.step).toBe('size')
    expect(fault({ ...DEFAULT_FIT_INPUTS, serviceTempC: { minC: 80, maxC: 20 } })?.step).toBe('requirements')
    expect(fault({ ...DEFAULT_FIT_INPUTS, requiredClearanceUm: { minUm: 40, maxUm: 0 } })?.step).toBe('requirements')
  })
})

