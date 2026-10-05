import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { PATTERN_WITH_KEENSERT } from '../testFixtures'
import { analyseJoint, boltResults } from './boltResults'
import { jointWarnings, patternWarnings } from './reportWarnings'

describe('jointWarnings', () => {
  it('lists the failing and marginal checks with the engine message', () => {
    const warnings = jointWarnings(expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si')).steps)
    expect(warnings).toHaveLength(3)
    expect(warnings[warnings.length - 1]).toMatch(/^R12 Safety against slipping: /)
  })
})

describe('patternWarnings', () => {
  it('groups the bolts of a load case by the check that governs them', () => {
    const warnings = patternWarnings(boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases)
    expect(warnings.some((w) => /^LC3 Braking: (B\d, )*B8(, B\d)* fail R12 Safety against slipping \(u up to \d+\.\d\d\)\.$/.test(w))).toBe(true)
  })

  it('reports a load case that cannot be analysed', () => {
    const warnings = patternWarnings(boltResults({ ...DEFAULT_BOLT_INPUTS, mode: 'pattern' }, 'si').loadCases)
    expect(warnings[0]).toMatch(/^LC1 Static: Joint type J4 .*outer thread/)
  })
})
