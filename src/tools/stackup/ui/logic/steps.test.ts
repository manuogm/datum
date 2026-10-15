import { describe, expect, it } from 'vitest'
import { analyseStack } from '../../calc'
import { EXAMPLE_STACK_INPUTS, NEW_STACK_INPUTS, newDimension, newGeometric, type StackInputs } from '../state/stackInputs'
import { engineInput } from './engineInput'
import { chainCount, faultField, requirementOptionsChanged, resultsHint, shownFault, stackSteps, stepFault, stepProblem } from './steps'
import { expectOk } from '../../../../core/testing'

const analysed = (inputs: StackInputs) => analyseStack(engineInput(inputs, new Map()))

describe('stepFault', () => {
  it('is null when the stack runs', () => {
    expect(stepFault(analysed(EXAMPLE_STACK_INPUTS))).toBeNull()
  })

  it('points a row the engine names at the chain step, with the row', () => {
    const inputs = { ...EXAMPLE_STACK_INPUTS, rows: [...EXAMPLE_STACK_INPUTS.rows, newDimension('r4')] }
    const fault = stepFault(analysed(inputs))
    expect(fault).toMatchObject({ step: 'chain', row: 3 })
    expect(fault?.error).toMatch(/^Row 4\b/)
  })

  it('points an empty chain at the chain step, without a row', () => {
    expect(stepFault(analysed(NEW_STACK_INPUTS))).toMatchObject({ step: 'chain', row: null })
  })

  it('points a requirement whose minimum is above its maximum at the requirement step', () => {
    const fault = stepFault(analysed({ ...EXAMPLE_STACK_INPUTS, requirement: { min: 22, max: 21 } }))
    expect(fault).toMatchObject({ step: 'requirement', row: null })
  })

  it('marks the faulty step in the step bar and gives its problem', () => {
    const fault = { step: 'chain' as const, error: 'Row 2 needs a nominal value.', row: 1 }
    expect(stackSteps('assembly', fault).map((s) => [s.label, s.invalid])).toEqual([
      ['Requirement', undefined], ['Parts', 'Row 2 needs a nominal value.'], ['Method', undefined], ['Results', undefined],
    ])
    expect(stepProblem(fault, 'chain')).toEqual({ title: 'This stack cannot be analysed', detail: 'Row 2 needs a nominal value.' })
    expect(stepProblem(fault, 'method')).toBeNull()
  })
})

describe('shownFault (the draft rule)', () => {
  const inputs = { rows: [newDimension('r1'), newDimension('r2')] }
  const fault = { step: 'chain' as const, error: 'Row 2 …', row: 1 }

  it('holds back the fault of a row still being typed', () => {
    expect(shownFault(fault, inputs, new Set(['r2']))).toBeNull()
  })

  it('shows it once the row has been left', () => {
    expect(shownFault(fault, inputs, new Set(['r1']))).toBe(fault)
  })

  it('always shows a fault that is not about a row', () => {
    const empty = { step: 'chain' as const, error: 'empty', row: null }
    expect(shownFault(empty, inputs, new Set(['r1', 'r2']))).toBe(empty)
  })
})

describe('faultField', () => {
  it('reads the input from the engine message, after the row and its label', () => {
    const message = (inputs: StackInputs) => {
      const result = analysed(inputs)
      return result.ok ? '' : result.error
    }
    const row = (changes: object) => message({ ...NEW_STACK_INPUTS, rows: [{ ...newDimension('r1', { kind: 'symmetric', plusMinus: 0.1 }), nominal: 5, ...changes }] })
    expect(faultField(row({ nominal: null }))).toBe('nominal')
    expect(faultField(row({ tolerance: { kind: 'symmetric', plusMinus: null } }))).toBe('tolerance')
    expect(faultField(row({ tolerance: newGeometric('position', null) }))).toBe('zone')
    expect(faultField(row({ tolerance: { ...newGeometric('position', 0.1), materialCondition: 'mmc' } }))).toBe('feature')
  })

  it('is not fooled by a word in the label', () => {
    expect(faultField('Row 2 "datum nominal" needs a value for its ± tolerance.')).toBe('tolerance')
  })

  it('is null for a message about the row as a whole', () => {
    expect(faultField('Row 1 "Spacer" is something else.')).toBeNull()
  })
})

describe('step texts', () => {
  it('counts what the More options hold', () => {
    expect(requirementOptionsChanged(NEW_STACK_INPUTS)).toBe(0)
    expect(requirementOptionsChanged({ standard: 'asme', startLabel: 'face A', endLabel: ' ' })).toBe(2)
  })

  it('counts the rows by kind', () => {
    expect(chainCount(EXAMPLE_STACK_INPUTS)).toBe('3 contributors')
    expect(chainCount({ mode: 'part', rows: [newDimension('r1')] })).toBe('1 contributor')
    expect(chainCount({ mode: 'assembly', rows: [newDimension('r1')] })).toBe('0 linked · 1 direct')
  })

  it('says what Results works out', () => {
    expect(resultsHint(EXAMPLE_STACK_INPUTS, expectOk(analysed(EXAMPLE_STACK_INPUTS)))).toBe(
      'Housing, shoulder to circlip groove through 3 contributors, by worst case and RSS.',
    )
  })
})
