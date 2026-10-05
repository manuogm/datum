import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { PATTERN_WITH_KEENSERT } from '../testFixtures'
import { analyseJoint, boltResults } from './boltResults'
import { boltHeadline, governingCase, jointHeadline, patternStatus, REVIEW_UTILISATION, utilisationTone, worstStatus } from './verdict'

describe('utilisationTone', () => {
  it('flags passing bolts above the review limit', () => {
    expect(utilisationTone(0.5, 'pass')).toBe('ok')
    expect(utilisationTone(REVIEW_UTILISATION, 'pass')).toBe('warn')
    expect(utilisationTone(0.2, 'warn')).toBe('warn')
    expect(utilisationTone(0.2, 'fail')).toBe('bad')
  })
})

describe('worstStatus', () => {
  it('orders pass < warn < fail', () => {
    expect(worstStatus(['pass', 'warn', 'pass'])).toBe('warn')
    expect(worstStatus(['warn', 'fail'])).toBe('fail')
    expect(worstStatus([])).toBe('pass')
  })
})

describe('governingCase', () => {
  const cases = boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases

  it('picks the load case with the most utilised bolt', () => {
    const governing = expectOk(governingCase(cases))
    const most = Math.max(...cases.map((c) => expectOk(c.analysis).governing.utilisation))
    expect(governing.bolt.utilisation).toBe(most)
    expect(governing.analysis.governing).toBe(governing.bolt)
    expect(patternStatus(cases.map((c) => expectOk(c.analysis)))).toMatch(/pass|warn|fail/)
  })

  it('passes on why a load case cannot be analysed', () => {
    expect(expectError(governingCase(boltResults(DEFAULT_BOLT_INPUTS, 'si').loadCases))).toMatch(/^LC1 Static: Joint type J4/)
  })
})

describe('jointHeadline', () => {
  it('names the governing check and how many pass', () => {
    const analysis = expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si'))
    expect(jointHeadline(analysis)).toEqual({ title: 'Fails: Safety against slipping', detail: '4 of 7 checks pass · R12 governs at u 2.01' })
  })

  it('says so when every check passes', () => {
    const analysis = expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si'))
    const passing = { ...analysis.summary, status: 'pass' as const, checksPassed: 7, utilisation: 0.8 }
    expect(jointHeadline({ steps: analysis.steps, summary: passing }).title).toBe('Passes every VDI 2230 check')
  })
})

describe('boltHeadline', () => {
  const cases = boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases
  const governingIn = (id: string) => expectOk(cases.find((c) => c.loadCase.id === id)!.analysis).governing

  it('names the failing check', () => {
    expect(boltHeadline(governingIn('LC3'), 'LC3')).toEqual({
      tone: 'bad', title: 'Governing: B8 (J4)', detail: expect.stringMatching(/^R12 Safety against slipping fails in LC3, u \d+\.\d\d$/),
    })
  })

  it('flags a marginal check, and a passing bolt above the review limit', () => {
    const bolt = governingIn('LC1')
    expect(boltHeadline({ ...bolt, status: 'warn' }, 'LC1')).toMatchObject({ tone: 'warn', detail: expect.stringMatching(/is marginal in LC1$/) })
    expect(boltHeadline({ ...bolt, status: 'pass', utilisation: 0.9 }, 'LC1')).toMatchObject({ tone: 'warn', detail: 'Above the 0.85 review limit in LC1' })
    expect(boltHeadline({ ...bolt, status: 'pass', utilisation: 0.5 }, 'LC1')).toMatchObject({ tone: 'ok', detail: 'Every check passes in LC1' })
  })
})
