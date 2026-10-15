import { describe, expect, it } from 'vitest'
import { STACK_ASSEMBLY_EXAMPLE, seedLibrary } from '../../../../core/library'
import { expectOk } from '../../../../core/testing'
import { stackResults } from '../logic/stackResults'
import { stackInputsFrom } from '../state/readInputs'
import { EXAMPLE_STACK_INPUTS, newDimension, newGeometric, type StackInputs } from '../state/stackInputs'
import { chartTone, stackChartModel } from './stackChart'

const SEEDED = '2026-10-14T14:02:00'
const library = seedLibrary(SEEDED)

function model(inputs: StackInputs, status = 'pass') {
  const results = stackResults(inputs, library)
  return stackChartModel({ inputs, analysis: expectOk(results.analysis), links: results.links }, 'si', status)
}

describe('stackChartModel', () => {
  const housing = model(EXAMPLE_STACK_INPUTS)

  it('draws the loop: each row from the running total before it to the one after', () => {
    expect(housing.lanes.map((lane) => [lane.from, lane.to])).toEqual([[0, 42], [42, 20], [20, 20.925]])
    expect(housing.result.end).toBeCloseTo(20.925, 12)
    expect(housing.lanes.map((lane) => lane.icon)).toEqual([null, 'gdt-position', null])
  })

  it('draws each band as it lands on the result, about the nominal', () => {
    const [shoulder, , groove] = housing.lanes
    expect(shoulder).toMatchObject({ centre: 0, value: '±0.050' })
    expect(shoulder.half).toBeCloseTo(0.05, 12)
    expect(groove.centre).toBeCloseTo(0.035, 12)
    expect(groove.value).toBe('+0.035 ±0.035')
    expect(housing.result.worstCase[0]).toBeCloseTo(-0.1, 12)
    expect(housing.result.worstCase[1]).toBeCloseTo(0.17, 12)
    expect(housing.result.window?.min).toBeCloseTo(-0.125, 12)
    expect(housing.result.window?.max).toBeCloseTo(0.175, 12)
  })

  it('keeps the effect axis symmetric about the nominal', () => {
    expect(housing.effectAxis.min).toBe(-housing.effectAxis.max)
    expect(housing.effectAxis.max).toBeGreaterThanOrEqual(0.175)
  })

  it('marks a limit far off scale at the panel edge instead', () => {
    const far = model({ ...EXAMPLE_STACK_INPUTS, requirement: { min: 20.8, max: 30 } })
    expect(far.result.window).toEqual({ min: expect.closeTo(-0.125, 12), max: null })
    expect(far.result.offScale).toEqual([{ side: 'upper', text: '30.000 ▸' }])
  })

  it('draws a form or orientation row (nominal 0) as a marker', () => {
    const flatness = { ...newDimension('r4', newGeometric('flatness', 0.02)), nominal: 0 }
    const lanes = model({ ...EXAMPLE_STACK_INPUTS, rows: [...EXAMPLE_STACK_INPUTS.rows, flatness] }).lanes
    expect(lanes[3].kind).toBe('marker')
  })

  it('draws a linked part with its ±3σ', () => {
    const assembly = model(stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(SEEDED)), 'review')
    expect(assembly.hasLinked).toBe(true)
    expect(assembly.lanes[0]).toMatchObject({ kind: 'linked', icon: 'link', label: 'Housing · shoulder to circlip groove' })
    expect(assembly.lanes[0].sigmaHalf).toBeCloseTo(3 * 0.0262996, 5)
    expect(assembly.result.tone).toBe('warn')
  })

  it('says the verdict in its accessible name, or that no requirement is set', () => {
    expect(housing.ariaLabel).toBe('Stack chart. Shoulder to circlip groove: worst case 20.825 … 21.095 mm, RSS 20.881 … 21.039 mm; pass by worst case.')
    const none = model({ ...EXAMPLE_STACK_INPUTS, requirement: { min: null, max: null } }, 'none')
    expect(none.result.window).toBeNull()
    expect(none.result.tone).toBe('neutral')
    expect(none.ariaLabel).toMatch(/no requirement is set\.$/)
  })
})

describe('chartTone', () => {
  it('colours the verdict method by the status', () => {
    expect(['pass', 'review', 'fail', 'none'].map(chartTone)).toEqual(['ok', 'warn', 'bad', 'neutral'])
  })
})
