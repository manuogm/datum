import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { JOINT_PEEK_NO_PG, PATTERN_MISSING_THREAD, PATTERN_WITH_KEENSERT } from '../testFixtures'
import { analyseJoint, boltResults } from './boltResults'
import {
  decidingBolt, formatUtilisation, governingCase, jointVerdict, loadCaseVerdict, openSteps, patternStatus, patternVerdict, REVIEW_UTILISATION,
  reviewReason, utilisationTone, verdictCheck, worstStatus,
} from './verdict'

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

describe('decidingBolt', () => {
  const lc1 = expectOk(boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases[0].analysis)

  it('puts a worse status before a higher utilisation', () => {
    const passing = lc1.bolts.find((b) => b.status === 'pass')!
    const marginal = lc1.bolts.find((b) => b.status === 'warn')!
    const bolts = [{ ...passing, utilisation: 0.99 }, { ...marginal, utilisation: 0.1 }]
    expect(decidingBolt({ ...lc1, bolts })).toBe(bolts[1])
    expect(decidingBolt({ ...lc1, bolts: [bolts[0], { ...passing, utilisation: 0.5 }] })).toBe(bolts[0])
  })
})

describe('governingCase', () => {
  const cases = boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases

  it('picks the load case whose deciding bolt is worst, and the highest u of any case', () => {
    const governing = expectOk(governingCase(cases))
    expect(governing.loadCase.id).toBe('LC3')
    expect(governing.bolt).toBe(decidingBolt(governing.analysis))
    expect(governing.bolt.status).toBe(patternStatus(cases.map((c) => expectOk(c.analysis))))
    expect(governing.maxUtilisation).toBe(Math.max(...cases.map((c) => expectOk(c.analysis).governing.utilisation)))
  })

  it('lets a failing case govern a case that is only more utilised', () => {
    const [lc1, lc2] = cases.map((c) => expectOk(c.analysis))
    const failing = { ...lc1, bolts: lc1.bolts.map((b, i) => (i === 0 ? { ...b, status: 'fail' as const, utilisation: 1.1 } : b)) }
    const utilised = { ...lc2, bolts: lc2.bolts.map((b) => ({ ...b, status: 'warn' as const, utilisation: 1.7 })) }
    const governing = expectOk(governingCase([{ ...cases[0], analysis: { ok: true, value: failing } }, { ...cases[1], analysis: { ok: true, value: utilised } }]))
    expect(governing.loadCase.id).toBe('LC1')
    expect(governing.maxUtilisation).toBe(1.7)
  })

  it('passes on why a load case cannot be analysed', () => {
    expect(expectError(governingCase(boltResults(PATTERN_MISSING_THREAD, 'si').loadCases))).toMatch(/^LC1 Static: Joint type J4/)
  })
})

describe('openSteps and reviewReason', () => {
  const peek = expectOk(analyseJoint(JOINT_PEEK_NO_PG, 'si'))

  it('finds the step behind a review, not the most utilised check', () => {
    expect(peek.summary.status).toBe('warn')
    const open = openSteps(peek.steps, 'warn')
    expect(open.map((s) => s.rStep)).toEqual(['R10'])
    expect(open[0].id).not.toBe(peek.summary.governing)
    expect(verdictCheck(peek)?.rStep).toBe('R10')
  })

  it('gives the engine\'s reason when the numbers do not say why, and none for a marginal safety factor', () => {
    const r10 = peek.steps.find((s) => s.id === 'surface-pressure')!
    expect(reviewReason(r10)).toMatch(/^No limiting surface pressure pG is known for PEEK: enter it/)
    const r8 = peek.steps.find((s) => s.id === 'working-stress')!
    expect(reviewReason(r8)).toBeNull()
    const marginal = { ...r8, status: 'warn' as const, check: { ...r8.check!, safetyFactor: 1.5, requiredSafetyFactor: 1.8 } }
    expect(reviewReason(marginal)).toBeNull()
    const estimated = { ...r8, status: 'warn' as const, message: 'SD = 3.39 (required 1.2). For stainless bolts it is only an estimate.' }
    expect(reviewReason(estimated)).toBe('For stainless bolts it is only an estimate.')
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

  it('names the open item behind a review, with where to enter it, when another check is more utilised', () => {
    expect(jointVerdict(expectOk(analyseJoint(JOINT_PEEK_NO_PG, 'si')))).toEqual({
      sentence: expect.stringMatching(
        /^Surface pressure under head and nut \(R10\) needs review: no limiting surface pressure pG is known for PEEK: enter it .*\. pG is asked for beside the part on the Joint step\.$/,
      ),
      detail: '5 of 6 checks pass · R10 needs review',
    })
  })

  it('suggests washers when the parts are crushed and there are none', () => {
    // Only R10 fails, and governs.
    const steps = analysis.steps.map((s) => (s.status === 'fail' && s.id !== 'surface-pressure' ? { ...s, status: 'pass' as const } : s))
    const summary = { ...analysis.summary, governing: 'surface-pressure' as const }
    expect(jointVerdict({ ...analysis, steps, summary }).sentence).toBe('Surface pressure under head and nut (R10) is not met and governs. ISO 7089 washers (Joint step) spread the load.')
  })

  it('says so when every check passes, naming the closest', () => {
    const passing = { ...analysis.summary, status: 'pass' as const, checksPassed: 7, utilisation: 0.8 }
    const steps = analysis.steps.map((s) => (s.status === 'fail' ? { ...s, status: 'pass' as const } : s))
    expect(jointVerdict({ ...analysis, steps, summary: passing })).toEqual({
      sentence: 'Every VDI 2230 check passes; the closest is safety against slipping (R12).',
      detail: '7 of 7 checks pass',
    })
  })
})

describe('loadCaseVerdict', () => {
  const cases = boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases
  const caseOf = (id: string) => cases.find((c) => c.loadCase.id === id)!
  const analysisIn = (id: string) => expectOk(caseOf(id).analysis)

  it('names the bolt, every failing check and the load case', () => {
    expect(loadCaseVerdict(analysisIn('LC3'), caseOf('LC3').loadCase)).toEqual({
      status: 'fail',
      sentence: 'B8 (J4) fails R12 safety against slipping and R5 minimum assembly preload in LC3 Braking.',
      detail: '3 of 8 bolts pass',
    })
  })

  it('names the check behind a review: R9 of a stainless bolt, though R12 is more utilised', () => {
    expect(loadCaseVerdict(analysisIn('LC1'), caseOf('LC1').loadCase)).toEqual({
      status: 'review',
      sentence: expect.stringMatching(/^B\d \(J2\) needs review on R9 alternating stress \(fatigue\) in LC1 Static: the VDI 2230 endurance limit .* only an estimate\.$/),
      detail: '6 of 8 bolts pass',
    })
  })

  it('names a passing bolt above the review limit', () => {
    const analysis = analysisIn('LC1')
    const passing = (utilisation: number) => ({ ...analysis, bolts: analysis.bolts.map((b) => ({ ...b, status: 'pass' as const, utilisation })) })
    expect(loadCaseVerdict(passing(0.9), caseOf('LC1').loadCase)).toMatchObject({
      status: 'pass', sentence: 'Every bolt passes in LC1; B1 (J1) in LC1 Static is above the 0.85 review limit.',
    })
    expect(loadCaseVerdict(passing(0.5), caseOf('LC1').loadCase).sentence).toBe('Every bolt passes in LC1; the most utilised is B1 (J1) in LC1 Static.')
  })
})

describe('patternVerdict', () => {
  it('judges the whole pattern by its governing load case, whichever tab is open', () => {
    const verdict = expectOk(patternVerdict(boltResults(PATTERN_WITH_KEENSERT, 'si').loadCases))
    expect(verdict).toMatchObject({
      status: 'fail',
      sentence: 'B8 (J4) fails R12 safety against slipping and R5 minimum assembly preload in LC3 Braking.',
      detail: '0 of 4 load cases pass · 3 of 8 bolts pass in LC3',
    })
    expect(verdict.governing.loadCase.id).toBe('LC3')
  })

  it('passes on why a load case cannot be analysed', () => {
    expect(expectError(patternVerdict(boltResults(PATTERN_MISSING_THREAD, 'si').loadCases))).toMatch(/^LC1 Static: /)
  })
})

describe('formatUtilisation', () => {
  it('shows two decimals, and ∞ when nothing is left to carry the load', () => {
    expect(formatUtilisation(0.871)).toBe('0.87')
    expect(formatUtilisation(Infinity)).toBe('∞')
  })
})
