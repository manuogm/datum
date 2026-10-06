import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { PATTERN_MISSING_THREAD, PATTERN_WITH_KEENSERT } from '../testFixtures'
import { boltResults, jointDesign } from './boltResults'

describe('boltResults', () => {
  it('analyses the default joint', () => {
    const joint = expectOk(boltResults(DEFAULT_BOLT_INPUTS, 'si').joint)
    expect(joint.geometry.thread.designation).toBe('M10')
    expect(joint.geometry.clampLengthMm).toBe(20)
  })

  it('analyses the default pattern', () => {
    expect(boltResults(DEFAULT_BOLT_INPUTS, 'si').loadCases.every((c) => c.analysis.ok)).toBe(true)
  })

  it('asks for the outer thread of a key-locking insert instead of guessing it', () => {
    const [first] = boltResults(PATTERN_MISSING_THREAD, 'si').loadCases
    expect(expectError(first.analysis)).toMatch(/^Joint type J4 \(M4 12\.9 \+ Keensert\): .*outer thread.*catalogue/)
  })

  it('analyses every load case once the catalogue value is entered', () => {
    const cases = boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases
    expect(cases.map((c) => c.loadCase.id)).toEqual(['LC1', 'LC2', 'LC3', 'LC4'])
    for (const c of cases) expect(expectOk(c.analysis).bolts).toHaveLength(8)
  })
})

describe('jointDesign', () => {
  it('fails on an unknown material', () => {
    const spec = { ...DEFAULT_BOLT_INPUTS.joint.design, plates: [{ materialId: 'unobtainium', thicknessMm: 5 }] }
    expect(jointDesign(spec, DEFAULT_BOLT_INPUTS.serviceTempC).ok).toBe(false)
  })
})
