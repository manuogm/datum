import { describe, expect, it } from 'vitest'
import { EXAMPLE_FIT_INPUTS } from './fitInputs'
import { fitReducer } from './fitReducer'

describe('fitReducer', () => {
  it('applies plain changes', () => {
    const next = fitReducer(EXAMPLE_FIT_INPUTS, { type: 'change', changes: { nominalMm: 40, assembly: 'press' } })
    expect(next.nominalMm).toBe(40)
    expect(next.assembly).toBe('press')
    expect(next.housingMaterialId).toBe(EXAMPLE_FIT_INPUTS.housingMaterialId)
  })

  it('toggles application functions on and off', () => {
    const added = fitReducer(EXAMPLE_FIT_INPUTS, { type: 'toggleFunction', fn: 'slide' })
    expect(added.functions).toEqual(['locate', 'transmit-torque', 'slide'])
    const removed = fitReducer(added, { type: 'toggleFunction', fn: 'locate' })
    expect(removed.functions).toEqual(['transmit-torque', 'slide'])
  })

  it('takes an applied fit into the calculator', () => {
    const fit = {
      hole: { kind: 'hole', letter: 'h', grade: '7' },
      shaft: { kind: 'shaft', letter: 'p', grade: '6' },
    } as const
    const next = fitReducer(EXAMPLE_FIT_INPUTS, { type: 'applyFit', fit })
    expect(next.mode).toBe('calculator')
    expect(next.shaft).toEqual(fit.shaft)
  })
})
