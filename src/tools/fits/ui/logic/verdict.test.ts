import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_FIT_INPUTS } from '../state/fitInputs'
import { fitResults } from './fitResults'
import { adviceVerdict, calculatorSentence, candidateStatus, governingEdge } from './verdict'

const window = { minUm: 0, maxUm: 40 }

describe('governingEdge', () => {
  it('picks the end furthest outside the window', () => {
    expect(governingEdge({ minUm: -5.3, maxUm: 77.9 }, window)).toEqual({ edge: 'max', valueUm: 77.9, limitUm: 40 })
    expect(governingEdge({ minUm: -20, maxUm: 41 }, window)).toEqual({ edge: 'min', valueUm: -20, limitUm: 0 })
  })

  it('picks the end closest to its limit when both are inside, the minimum on a tie', () => {
    expect(governingEdge({ minUm: 2, maxUm: 30 }, window)).toEqual({ edge: 'min', valueUm: 2, limitUm: 0 })
    expect(governingEdge({ minUm: 15, maxUm: 38 }, window)).toEqual({ edge: 'max', valueUm: 38, limitUm: 40 })
    expect(governingEdge({ minUm: 5, maxUm: 35 }, window).edge).toBe('min')
  })
})

describe('candidateStatus', () => {
  const check = (status: 'pass' | 'warn' | 'fail') => ({ id: 'service-window', status, message: '', penalty: 0 }) as const
  it('fails on any failed check, else asks for review on any warning', () => {
    expect(candidateStatus({ checks: [check('pass'), check('pass')] })).toBe('pass')
    expect(candidateStatus({ checks: [check('pass'), check('warn')] })).toBe('review')
    expect(candidateStatus({ checks: [check('warn'), check('fail')] })).toBe('fail')
  })
})

describe('adviceVerdict', () => {
  it('leaves out the thermal sentence and keeps the verdict on the best match', () => {
    const why = expectOk(fitResults(DEFAULT_FIT_INPUTS, 'si').advice).why
    const { sentence, detail } = adviceVerdict(why)
    expect(why.startsWith('The ')).toBe(true)
    expect(why).toContain(sentence)
    expect(sentence).toMatch(/^(H|No ISO fit)/)
    if (detail !== null) expect(why.endsWith(detail)).toBe(true)
  })

  it('splits only between sentences, not inside numbers', () => {
    expect(adviceVerdict('The housing grows 0.5 µm. No ISO fit stays inside. H7/k6 comes closest, with −1.5 … 3 µm.')).toEqual({
      sentence: 'No ISO fit stays inside.',
      detail: 'H7/k6 comes closest, with −1.5 … 3 µm.',
    })
    expect(adviceVerdict('Only one sentence.')).toEqual({ sentence: 'Only one sentence.', detail: null })
  })
})

describe('calculatorSentence', () => {
  it('says how the clearance in service stands and which edge governs', () => {
    expect(calculatorSentence('review', 'max')).toBe('The clearance in service is partly outside the required window; the maximum clearance governs.')
    expect(calculatorSentence('fail', 'min')).toBe('The clearance in service is outside the required window; the minimum clearance governs.')
    expect(calculatorSentence('pass', 'min')).toMatch(/^The clearance in service stays inside the required window; .*\.$/)
  })
})
