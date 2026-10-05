import { describe, expect, it } from 'vitest'
import { PATTERN_WITH_KEENSERT } from '../testFixtures'
import { DEFAULT_BOLT_INPUTS, DEFAULT_PATTERN } from './boltInputs'
import { boltInputsFrom } from './readInputs'

const viaJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown

describe('boltInputsFrom', () => {
  it('reads complete inputs unchanged', () => {
    expect(boltInputsFrom(viaJson(DEFAULT_BOLT_INPUTS))).toEqual(DEFAULT_BOLT_INPUTS)
    expect(boltInputsFrom(viaJson(PATTERN_WITH_KEENSERT))).toEqual(PATTERN_WITH_KEENSERT)
  })

  it('keeps an outer thread that was not entered as not entered', () => {
    const j4 = boltInputsFrom(viaJson(DEFAULT_BOLT_INPUTS)).pattern.jointTypes[3].design.joint
    expect(j4).toMatchObject({ kind: 'insert', insert: 'key-locking', outerThread: null })
  })

  it('keeps the default for each malformed field of the joint', () => {
    const inputs = boltInputsFrom({
      mode: 'sideways',
      serviceTempC: { minC: -40 },
      joint: {
        design: { propertyClass: '9.9', headType: 'socket', plates: [{ materialId: 'unobtainium', thicknessMm: 3 }], threadFriction: '0.1' },
        loads: { axialMaxN: 5_000, transverseVariation: 'sometimes' },
      },
    })
    expect(inputs).toEqual({
      ...DEFAULT_BOLT_INPUTS,
      joint: {
        design: { ...DEFAULT_BOLT_INPUTS.joint.design, headType: 'socket' },
        loads: { ...DEFAULT_BOLT_INPUTS.joint.loads, axialMaxN: 5_000 },
      },
    })
    expect(boltInputsFrom(null)).toEqual(DEFAULT_BOLT_INPUTS)
  })

  it('falls back to the default pattern when its parts do not belong together', () => {
    const pattern = { ...DEFAULT_PATTERN, bolts: [{ id: 'B1', xMm: 0, yMm: 0, jointTypeId: 'J9' }] }
    expect(boltInputsFrom({ pattern }).pattern).toEqual(DEFAULT_PATTERN)
    expect(boltInputsFrom({ pattern: { ...DEFAULT_PATTERN, loadCases: [] } }).pattern).toEqual(DEFAULT_PATTERN)
  })

  it('shows the first load case when the chosen one is missing', () => {
    expect(boltInputsFrom({ pattern: { ...DEFAULT_PATTERN, loadCaseId: 'LC9' } }).pattern.loadCaseId).toBe('LC1')
  })
})
