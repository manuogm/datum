import { describe, expect, it } from 'vitest'
import { EXAMPLE_FIT_INPUTS, NEW_FIT_INPUTS, type FitInputs } from '../state/fitInputs'
import { fitResults, NO_WINDOW_ERROR } from './fitResults'
import { fitSteps, stepFault } from './fitSteps'

const calculator: FitInputs = { ...EXAMPLE_FIT_INPUTS, mode: 'calculator' }
const fault = (inputs: FitInputs) => stepFault(inputs, fitResults(inputs, 'si'))

describe('fitSteps', () => {
  it('follows the mode chosen on the first step', () => {
    expect(fitSteps(calculator, null).map((s) => s.label)).toEqual(['Size & fit', 'Service', 'Results'])
    expect(fitSteps(EXAMPLE_FIT_INPUTS, null).map((s) => s.label)).toEqual(['Application', 'Size & materials', 'Requirements', 'Results'])
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
    expect(fault(EXAMPLE_FIT_INPUTS)).toBeNull()
    expect(fault(calculator)).toBeNull()
  })

  it('blames the size step for a size outside ISO 286, else the requirements', () => {
    expect(fault({ ...EXAMPLE_FIT_INPUTS, nominalMm: 5000 })?.step).toBe('size')
    expect(fault({ ...EXAMPLE_FIT_INPUTS, serviceTempC: { minC: 80, maxC: 20 } })?.step).toBe('requirements')
    expect(fault({ ...EXAMPLE_FIT_INPUTS, requiredClearanceUm: { minUm: 40, maxUm: 0 } })?.step).toBe('requirements')
  })
})


describe('stepFault, calculator', () => {
  it('says a size outside ISO 286 is the problem, not the fit', () => {
    expect(fault({ ...calculator, nominalMm: 5000 })?.note).toBe('Enter a size ISO 286 covers')
  })

  it('marks the service step for a range the wrong way round, as the advisor does', () => {
    const temps = fault({ ...calculator, serviceTempC: { minC: 100, maxC: 0 } })
    expect(temps).toMatchObject({ step: 'service', note: 'Check the ranges above' })
    expect(temps?.error).toMatch(/lower to the higher temperature/)
    expect(fault({ ...calculator, requiredClearanceUm: { minUm: 80, maxUm: 10 } })?.step).toBe('service')
    expect(fitSteps(calculator, temps)[1].invalid).toBe(temps?.error)
  })

  it('accepts no required window', () => {
    expect(fault({ ...NEW_FIT_INPUTS, mode: 'calculator' })).toBeNull()
  })
})

describe('stepFault, advisor without a window', () => {
  it('asks for the window on the requirements step', () => {
    expect(fault({ ...NEW_FIT_INPUTS, mode: 'advisor' })).toEqual({ step: 'requirements', error: NO_WINDOW_ERROR, note: 'Enter the clearance needed in service' })
  })
})
