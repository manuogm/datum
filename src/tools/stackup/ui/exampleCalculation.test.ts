import { describe, expect, it } from 'vitest'
import { EXAMPLE_SUMMARIES, STACK_ASSEMBLY_EXAMPLE, seedLibrary, summaryOf } from '../../../core/library'
import { expectOk } from '../../../core/testing'
import { HOUSING_PART_STACK, analyseStack, endPlayAssembly } from '../calc'
import { stackResults } from './logic/stackResults'
import { stackSnapshot } from './stackSnapshot'
import { stackInputsFrom } from './state/readInputs'

const NOW = '2026-10-14T14:02:00'
const library = seedLibrary(NOW)

describe('the Tolerance Stack-up examples in the seeded library', () => {
  it('lists what the tool computes for the housing Part stack', () => {
    // Stored without inputs; the tool opens it on EXAMPLE_STACK_INPUTS.
    expect(summaryOf(expectOk(stackSnapshot(stackInputsFrom(null), library)))).toEqual(EXAMPLE_SUMMARIES.stack)
  })

  it('lists what the tool computes for the Bearing end play assembly', () => {
    const inputs = stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(NOW))
    expect(summaryOf(expectOk(stackSnapshot(inputs, library)))).toEqual(STACK_ASSEMBLY_EXAMPLE.summary)
  })

  it('opens the housing example on the engine notes example (HOUSING_PART_STACK)', () => {
    expect(stackResults(stackInputsFrom(null), library).input).toEqual(HOUSING_PART_STACK)
  })

  it('works the assembly out as the engine notes do (endPlayAssembly of the housing result)', () => {
    const inputs = stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(NOW))
    const results = stackResults(inputs, library)
    expect(results.links.get('r1')?.state).toBe('linked')
    const housing = expectOk(analyseStack(HOUSING_PART_STACK)).stackResult
    const expected = endPlayAssembly(housing)
    // The linked row is named by its part ("Housing"); the maths is the same.
    const [linked, ...direct] = expected.contributors
    expect(results.input).toEqual({ ...expected, contributors: [{ ...linked, label: 'Housing' }, ...direct] })
  })

  it('stores the housing values the assembly was saved with', () => {
    const housing = expectOk(analyseStack(HOUSING_PART_STACK)).stackResult
    const row = stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(NOW)).rows[0]
    if (row.kind !== 'linked') throw new Error('the first row links the housing')
    const { stack } = row.last
    expect(stack.nominal).toBeCloseTo(housing.nominal, 9)
    expect(stack.mean).toBeCloseTo(housing.mean, 9)
    expect(stack.upperDeviation).toBeCloseTo(housing.upperDeviation, 9)
    expect(stack.lowerDeviation).toBeCloseTo(housing.lowerDeviation, 9)
    expect(stack.sigma).toBeCloseTo(housing.sigma, 6)
  })
})
