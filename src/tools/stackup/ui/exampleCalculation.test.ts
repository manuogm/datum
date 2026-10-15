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

  it('opens the housing example on the engine notes example (HOUSING_PART_STACK), the groove width entered as drawn ×½', () => {
    const input = stackResults(stackInputsFrom(null), library).input
    const [shoulder, groove, width] = HOUSING_PART_STACK.contributors
    // 1.85 +0.14/0 counted half is the engine notes' 0.925 +0.07/0.
    expect(input).toEqual({
      ...HOUSING_PART_STACK,
      contributors: [shoulder, groove, { ...width, label: 'Groove width, half of it', sensitivity: 0.5, nominal: 1.85, tolerance: { kind: 'deviations', upper: 0.14, lower: 0 } }],
    })
    // The results are those of the engine notes, row by row.
    const seeded = expectOk(analyseStack(input))
    const notes = expectOk(analyseStack(HOUSING_PART_STACK))
    for (const key of ['nominal', 'mean', 'sigma'] as const) expect(seeded[key]).toBeCloseTo(notes[key], 12)
    for (const key of ['min', 'max'] as const) {
      expect(seeded.worstCase[key]).toBeCloseTo(notes.worstCase[key], 12)
      expect(seeded.rss[key]).toBeCloseTo(notes.rss[key], 12)
    }
    seeded.contributors.forEach((row, i) => {
      expect(row.worstCasePercent).toBeCloseTo(notes.contributors[i].worstCasePercent, 9)
      expect(row.rssPercent).toBeCloseTo(notes.contributors[i].rssPercent, 9)
    })
    expect(seeded.verdict).toEqual(notes.verdict)
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
