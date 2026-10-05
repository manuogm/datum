import { describe, expect, it } from 'vitest'
import { materialById } from '../../../../core/materials'
import { adviseFit } from '../../advisor'
import { expectOk } from '../../calc/testHelpers'
import { CHARTED_CANDIDATES, chartedCandidates, scoreTone } from './candidates'

const advice = expectOk(adviseFit({
  nominalMm: 25,
  housing: expectOk(materialById('al-7075-t6')),
  shaft: expectOk(materialById('steel-42crmo4-qt')),
  functions: ['locate', 'transmit-torque'],
  assembly: 'thermal',
  serviceTempC: { minC: -20, maxC: 140 },
  requiredClearanceUm: { minUm: 0, maxUm: 40 },
  maxAssemblyInterferenceUm: 40,
}))
const designations = (list: readonly { fit: { designation: string } }[]) => list.map((c) => c.fit.designation)

describe('chartedCandidates', () => {
  it('shows the best-ranked candidates, loosest first', () => {
    const shown = chartedCandidates(advice.candidates, null)
    expect(shown).toHaveLength(CHARTED_CANDIDATES)
    expect(new Set(designations(shown))).toEqual(new Set(designations(advice.candidates.slice(0, CHARTED_CANDIDATES))))
    const means = shown.map((c) => c.fit.meanClearanceUm)
    expect(means).toEqual([...means].sort((a, b) => b - a))
  })

  it('adds a lower-ranked compared candidate', () => {
    const last = advice.candidates.at(-1)!.fit.designation
    const shown = chartedCandidates(advice.candidates, last)
    expect(shown).toHaveLength(CHARTED_CANDIDATES + 1)
    expect(designations(shown)).toContain(last)
  })

  it('does not change the advice', () => {
    const before = designations(advice.candidates)
    chartedCandidates(advice.candidates, null)
    expect(designations(advice.candidates)).toEqual(before)
  })
})

describe('scoreTone', () => {
  it('colours scores green, amber or red', () => {
    expect([94, 90, 81, 70, 69, 0].map(scoreTone)).toEqual(['ok', 'ok', 'warn', 'warn', 'bad', 'bad'])
  })
})
