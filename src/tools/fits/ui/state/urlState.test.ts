import { describe, expect, it } from 'vitest'
import { DEFAULT_FIT_INPUTS, type FitInputs } from './fitInputs'
import { decodeFitInputs, encodeFitInputs, fitHref } from './urlState'

const edited: FitInputs = {
  mode: 'calculator',
  nominalMm: 40.5,
  hole: { kind: 'hole', letter: 'js', grade: '7' },
  shaft: { kind: 'shaft', letter: 'p', grade: '6' },
  functions: ['slide'],
  housingMaterialId: 'ti-6al-4v',
  shaftMaterialId: 'steel-316l',
  assembly: 'press',
  serviceTempC: { minC: -40, maxC: 85 },
  requiredClearanceUm: { minUm: -10, maxUm: 25 },
  maxAssemblyInterferenceUm: 15,
}

describe('encodeFitInputs', () => {
  it('writes nothing for the defaults', () => {
    expect(encodeFitInputs(DEFAULT_FIT_INPUTS)).toBe('')
  })

  it('writes only the changed values, readably', () => {
    expect(encodeFitInputs({ ...DEFAULT_FIT_INPUTS, mode: 'calculator', shaft: edited.shaft })).toBe('m=calculator&s=p6')
    expect(encodeFitInputs({ ...DEFAULT_FIT_INPUTS, serviceTempC: { minC: -40, maxC: 85 } })).toBe('t=-40,85')
  })
})

describe('decodeFitInputs', () => {
  it('round-trips every input', () => {
    expect(decodeFitInputs(encodeFitInputs(edited))).toEqual(edited)
    expect(decodeFitInputs(`?${encodeFitInputs(edited)}`)).toEqual(edited)
  })

  it('keeps the default for malformed values', () => {
    const inputs = decodeFitInputs('m=x&d=abc&h=g6&s=H7&f=locate,fly&hm=unobtainium&a=glue&t=1&c=1,2,3&i=')
    expect(inputs).toEqual(DEFAULT_FIT_INPUTS)
  })

  it('accepts an empty function list', () => {
    expect(decodeFitInputs('f=').functions).toEqual([])
  })
})

describe('fitHref', () => {
  it('links to the tool or the report with the inputs', () => {
    expect(fitHref(DEFAULT_FIT_INPUTS)).toBe('#/fit')
    expect(fitHref({ ...DEFAULT_FIT_INPUTS, nominalMm: 40 })).toBe('#/fit?d=40')
    expect(fitHref({ ...DEFAULT_FIT_INPUTS, nominalMm: 40 }, 'report', true)).toBe('#/fit/report?d=40&print=1')
    expect(fitHref(DEFAULT_FIT_INPUTS, 'report')).toBe('#/fit/report')
  })
})
