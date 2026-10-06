import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { analyseFitDesignation } from '../../calc'
import { EXAMPLE_FIT_INPUTS, NEW_FIT_INPUTS, type FitInputs } from '../state/fitInputs'
import { fitResults } from './fitResults'
import { serviceClearance } from './serviceClearance'
import {
  adviceVerdict, advisorVerdict, calculatorSentence, candidateStatus, governingEdge, presentedStatus, unjudgedSentence,
} from './verdict'

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
    const why = expectOk(fitResults(EXAMPLE_FIT_INPUTS, 'si').advice).why
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

// Press assembly needing −60 … 0 µm in service, but at most 5 µm interference at assembly:
// the best match cannot meet both, and its sentence must say so.
const pressInputs: FitInputs = {
  ...EXAMPLE_FIT_INPUTS,
  assembly: 'press',
  requiredClearanceUm: { minUm: -60, maxUm: 0 },
  maxAssemblyInterferenceUm: 5,
}

describe('advisorVerdict', () => {
  it('names the failing check when the best match does not pass', () => {
    const advice = expectOk(fitResults(pressInputs, 'si').advice)
    const best = advice.candidates[0]
    const failing = best.checks.find((check) => check.status === 'fail')
    expect(candidateStatus(best)).toBe('fail')
    const { sentence, detail } = advisorVerdict(best, advice.why)
    expect(sentence).toBe(`${best.fit.designation} (score ${best.score}) fails a check: ${failing?.message}`)
    expect(sentence).toMatch(/interference at 20 °C exceeds the 5 µm limit/)
    // The advisor's own verdict follows.
    expect(detail).toBe(adviceVerdict(advice.why).sentence + (adviceVerdict(advice.why).detail ? ` ${adviceVerdict(advice.why).detail}` : ''))
  })

  it("keeps the advisor's verdict when the best match passes every check", () => {
    const inputs: FitInputs = { ...EXAMPLE_FIT_INPUTS, functions: [], requiredClearanceUm: { minUm: -100, maxUm: 200 } }
    const advice = expectOk(fitResults(inputs, 'si').advice)
    expect(candidateStatus(advice.candidates[0])).toBe('pass')
    expect(advisorVerdict(advice.candidates[0], advice.why)).toEqual(adviceVerdict(advice.why))
  })
})

describe('presentedStatus', () => {
  it("takes the advisor's checks of the best match in advisor mode", () => {
    const results = fitResults(pressInputs, 'si')
    const best = expectOk(results.advice).candidates[0]
    const service = serviceClearance(best.fit, pressInputs, results.housing, results.shaft)
    // The assembly check fails, whatever the clearance in service.
    expect(presentedStatus(pressInputs, results, best.fit, service)).toBe('fail')
  })

  it('takes the clearance in service in calculator mode, pass without a window', () => {
    const inputs: FitInputs = { ...NEW_FIT_INPUTS, mode: 'calculator' }
    const results = fitResults(inputs, 'si')
    const fit = expectOk(results.calculation)
    expect(presentedStatus(inputs, results, fit, serviceClearance(fit, inputs, results.housing, results.shaft))).toBe('pass')
  })
})

describe('unjudgedSentence', () => {
  const steel = fitResults(NEW_FIT_INPUTS, 'si')
  const sentence = (designation: string, label: string) => {
    const fit = expectOk(analyseFitDesignation(designation, 25))
    return unjudgedSentence(label, fit, serviceClearance(fit, NEW_FIT_INPUTS, steel.housing, steel.shaft), 'si')
  }

  it('states the fit, its clearance at 20 °C and in service, and that no window is set', () => {
    expect(sentence('H9/d9', 'Clearance')).toBe('Clearance fit: clearance 65 … 169 µm at 20 °C, 65 … 169 µm in service; no required window is set.')
  })

  it('writes an interference fit as interference', () => {
    expect(sentence('H7/s6', 'Interference')).toMatch(/^Interference fit: interference 14 … 48 µm at 20 °C/)
  })
})
