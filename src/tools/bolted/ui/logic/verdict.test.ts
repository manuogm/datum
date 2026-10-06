import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { PATTERN_MISSING_THREAD, PATTERN_WITH_KEENSERT } from '../testFixtures'
import { analyseJoint, boltResults } from './boltResults'
import { formatUtilisation, governingCase, jointVerdict, loadCaseVerdict, patternStatus, REVIEW_UTILISATION, utilisationTone, worstStatus } from './verdict'

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
    expect(expectError(governingCase(boltResults(PATTERN_MISSING_THREAD, 'si').loadCases))).toMatch(/^LC1 Static: Joint type J4/)
  })
})

describe('jointVerdict', () => {
  const analysis = expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si'))

  it('names the governing check, how many pass and which fail', () => {
    expect(jointVerdict(analysis)).toEqual({
      sentence: 'Safety against slipping (R12) is not met and governs.',
      detail: '4 of 7 checks pass · R5, R10 and R12 fail',
    })
  })

  it('says so when every check passes, naming the closest', () => {
    const passing = { ...analysis.summary, status: 'pass' as const, checksPassed: 7, utilisation: 0.8 }
    const steps = analysis.steps.map((s) => (s.status === 'fail' ? { ...s, status: 'pass' as const } : s))
    expect(jointVerdict({ steps, summary: passing })).toEqual({
      sentence: 'Every VDI 2230 check passes; the closest is safety against slipping (R12).',
      detail: '7 of 7 checks pass',
    })
  })
})

describe('loadCaseVerdict', () => {
  const cases = boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases
  const caseOf = (id: string) => cases.find((c) => c.loadCase.id === id)!
  const analysisIn = (id: string) => expectOk(caseOf(id).analysis)

  it('names the bolt, the failing check and the load case', () => {
    expect(loadCaseVerdict(analysisIn('LC3'), caseOf('LC3').loadCase)).toEqual({
      status: 'fail',
      sentence: 'B8 (J4) fails R12 safety against slipping in LC3 Braking.',
      detail: expect.stringMatching(/^\d of 8 bolts pass$/),
    })
  })

  it('flags a marginal check, and a passing bolt above the review limit', () => {
    const analysis = analysisIn('LC1')
    const withGoverning = (changes: Partial<typeof analysis.governing>) => ({ ...analysis, governing: { ...analysis.governing, ...changes } })
    const lc1 = caseOf('LC1').loadCase
    expect(loadCaseVerdict(withGoverning({ status: 'warn' }), lc1)).toMatchObject({ status: 'review', sentence: expect.stringMatching(/is marginal on R\d+ .* in LC1 Static\.$/) })
    expect(loadCaseVerdict(withGoverning({ status: 'pass', utilisation: 0.9 }), lc1)).toMatchObject({
      status: 'review', sentence: expect.stringMatching(/^Every bolt passes in LC1 Static; B\d \(J\d\) is above the 0\.85 review limit\.$/),
    })
    expect(loadCaseVerdict(withGoverning({ status: 'pass', utilisation: 0.5 }), lc1)).toMatchObject({ status: 'pass', sentence: 'Every bolt passes in LC1 Static.' })
  })
})

describe('formatUtilisation', () => {
  it('shows two decimals, and ∞ when nothing is left to carry the load', () => {
    expect(formatUtilisation(0.871)).toBe('0.87')
    expect(formatUtilisation(Infinity)).toBe('∞')
  })
})
