import { describe, expect, it } from 'vitest'
import { EXAMPLE_FIT_INPUTS, NEW_FIT_INPUTS, type FitInputs } from './fitInputs'
import { asFunctions, asZone, fitInputsFrom } from './readInputs'

const saved: FitInputs = {
  mode: 'calculator',
  nominalMm: 40,
  hole: { kind: 'hole', letter: 'h', grade: '6' },
  shaft: { kind: 'shaft', letter: 'k', grade: '5' },
  functions: ['locate', 'rotate'],
  housingMaterialId: 'ti-6al-4v',
  shaftMaterialId: 'steel-316l',
  assembly: 'press',
  serviceTempC: { minC: -40, maxC: 85 },
  requiredClearanceUm: { minUm: -20, maxUm: 20 },
  maxAssemblyInterferenceUm: 15,
}

describe('fitInputsFrom', () => {
  it('reads complete saved inputs unchanged', () => {
    expect(fitInputsFrom(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })

  it('reads a calculation without a required window back without one', () => {
    expect(fitInputsFrom(JSON.parse(JSON.stringify(NEW_FIT_INPUTS)))).toEqual(NEW_FIT_INPUTS)
    expect(fitInputsFrom({ ...saved, requiredClearanceUm: null }).requiredClearanceUm).toBeNull()
  })

  it('keeps the default for each missing or malformed field', () => {
    expect(fitInputsFrom({ nominalMm: 40, hole: { letter: 'g', grade: '6' }, assembly: 'glue', serviceTempC: { minC: 0 } })).toEqual({
      ...EXAMPLE_FIT_INPUTS,
      nominalMm: 40,
    })
    expect(fitInputsFrom(null)).toEqual(EXAMPLE_FIT_INPUTS)
    expect(fitInputsFrom('H7/g6')).toEqual(EXAMPLE_FIT_INPUTS)
  })
})

describe('asZone', () => {
  it('reads a class as text or as a ZoneSpec of the right kind', () => {
    expect(asZone('H7', 'hole')).toEqual({ kind: 'hole', letter: 'h', grade: '7' })
    expect(asZone({ kind: 'shaft', letter: 'p', grade: '6' }, 'shaft')).toEqual({ kind: 'shaft', letter: 'p', grade: '6' })
    expect(asZone('p6', 'hole')).toBeNull()
    expect(asZone(7, 'hole')).toBeNull()
  })
})

describe('asFunctions', () => {
  it('rejects unknown or repeated functions', () => {
    expect(asFunctions(['slide', 'locate'])).toEqual(['locate', 'slide'])
    expect(asFunctions(['locate', 'fly'])).toBeNull()
    expect(asFunctions(['locate', 'locate'])).toBeNull()
  })
})
