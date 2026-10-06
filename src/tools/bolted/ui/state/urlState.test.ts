import { describe, expect, it } from 'vitest'
import { PATTERN_WITH_KEENSERT } from '../testFixtures'
import { DEFAULT_BOLT_INPUTS, DEFAULT_PATTERN, type BoltInputs } from './boltInputs'
import { boltHref, decodeBoltInputs, encodeBoltInputs } from './urlState'

const renamed: BoltInputs = {
  ...PATTERN_WITH_KEENSERT,
  serviceTempC: { minC: -40, maxC: 85 },
  pattern: { ...PATTERN_WITH_KEENSERT.pattern, loadCases: [{ ...DEFAULT_PATTERN.loadCases[0], name: 'Bremsen ±1 g' }] , loadCaseId: 'LC1' },
}

describe('encodeBoltInputs', () => {
  it('writes nothing for the defaults', () => {
    expect(encodeBoltInputs(DEFAULT_BOLT_INPUTS)).toBe('')
  })

  it('writes the mode and temperatures plainly and leaves out the default joint', () => {
    expect(encodeBoltInputs({ ...DEFAULT_BOLT_INPUTS, mode: 'pattern', serviceTempC: { minC: -40, maxC: 120 } })).toBe('m=pattern&t=-40,120')
  })
})

describe('decodeBoltInputs', () => {
  it('round-trips every input, including non-ASCII names', () => {
    expect(decodeBoltInputs(encodeBoltInputs(renamed))).toEqual(renamed)
    const joint = { ...DEFAULT_BOLT_INPUTS, joint: { ...DEFAULT_BOLT_INPUTS.joint, loads: { ...DEFAULT_BOLT_INPUTS.joint.loads, axialMaxN: 8_000 } } }
    expect(decodeBoltInputs(`?${encodeBoltInputs(joint)}`)).toEqual(joint)
  })

  it('keeps the defaults for malformed parameters', () => {
    expect(decodeBoltInputs('m=x&t=1&j=%%%&p=bm90IGpzb24')).toEqual(DEFAULT_BOLT_INPUTS)
  })
})

describe('boltHref', () => {
  it('links to the tool or the report', () => {
    expect(boltHref(DEFAULT_BOLT_INPUTS)).toBe('#/bolt')
    expect(boltHref({ ...DEFAULT_BOLT_INPUTS, mode: 'pattern' }, 'report', true)).toBe('#/bolt/report?m=pattern&print=1')
  })
})
