import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { JOINT_PEEK_NO_PG, PATTERN_MISSING_THREAD, PATTERN_WITH_KEENSERT } from '../testFixtures'
import { analyseJoint, boltResults } from './boltResults'
import { jointWarnings, patternWarnings } from './reportWarnings'

describe('jointWarnings', () => {
  it('lists the failing and marginal checks with the engine message', () => {
    const warnings = jointWarnings(expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si')).steps)
    expect(warnings).toHaveLength(3)
    expect(warnings[warnings.length - 1]).toMatch(/^R12 Safety against slipping: /)
  })

  it('lists a check without a number that needs review', () => {
    expect(jointWarnings(expectOk(analyseJoint(JOINT_PEEK_NO_PG, 'si')).steps)).toEqual([
      expect.stringMatching(/^R10 Surface pressure under head and nut: No limiting surface pressure pG is known for PEEK/),
    ])
  })
})

describe('patternWarnings', () => {
  const warnings = patternWarnings(boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases)

  it('groups the bolts of a load case by each check that fails or is marginal on them', () => {
    expect(warnings).toContain('LC3 Braking: B2, B8 fail R12 Safety against slipping (u up to 3.28).')
    expect(warnings).toContain('LC3 Braking: B6 fails R5 Safety against separation (u up to 1.15).')
    expect(warnings.some((w) => /^LC3 Braking: B5, B7 are marginal on R12 Safety against slipping \(u up to \d\.\d\d\)\.$/.test(w))).toBe(true)
  })

  it('names a check that needs review though it is not the most utilised, with the reason', () => {
    expect(warnings[0]).toMatch(/^LC1 Static: B5, B6 need review on R9 Alternating stress \(fatigue\): The VDI 2230 endurance limit .* only an estimate\.$/)
  })

  it('reports a load case that cannot be analysed', () => {
    const warnings = patternWarnings(boltResults(PATTERN_MISSING_THREAD, 'si').loadCases)
    expect(warnings[0]).toMatch(/^LC1 Static: Joint type J4 .*outer thread/)
  })
})
