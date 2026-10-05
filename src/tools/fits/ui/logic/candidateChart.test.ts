import { describe, expect, it } from 'vitest'
import { CANDIDATE_CHART_FRAME as F, candidateChartLayout, type ChartCandidateInput } from './candidateChart'

const h7g6: ChartCandidateInput = {
  designation: 'H7/g6',
  bands: [
    { kind: 'cold', min: -5.3, max: 28.7 },
    { kind: 'reference', min: 7, max: 41 },
    { kind: 'hot', min: 43.9, max: 77.9 },
  ],
}
const h7p6: ChartCandidateInput = {
  designation: 'H7/p6',
  bands: [
    { kind: 'reference', min: -35, max: -1 },
    { kind: 'hot', min: 1.9, max: 35.9 },
  ],
}

const layout = candidateChartLayout({ candidates: [h7g6, h7p6], window: { min: 0, max: 40 }, interferenceLimit: 40 })

describe('candidateChartLayout', () => {
  it('fits every value on a nice axis inside the frame', () => {
    expect(layout.ticks.map((t) => t.value)).toEqual([-40, -20, 0, 20, 40, 60, 80])
    expect(layout.ticks[0].y).toBe(F.valueBottom)
    expect(layout.ticks.at(-1)?.y).toBe(F.valueTop)
  })

  it('places the window, the zero line and the interference limit by value', () => {
    expect(layout.windowBottom).toBe(layout.zeroY)
    expect(layout.windowTop).toBeLessThan(layout.zeroY)
    expect(layout.interferenceY).toBe(F.valueBottom)
  })

  it('spreads the columns evenly and orders bars cold to hot', () => {
    const [first, second] = layout.columns
    expect(first.x).toBe(F.left + 160)
    expect(second.x).toBe(F.left + 480)
    expect(first.bars.map((bar) => bar.kind)).toEqual(['cold', 'reference', 'hot'])
    expect(first.bars[0].x).toBeLessThan(first.bars[1].x)
  })

  it('draws taller bars for wider bands and links neighbouring bars', () => {
    const [cold, reference] = layout.columns[0].bars
    expect(reference.height).toBeCloseTo(cold.height)
    expect(layout.columns[0].links).toHaveLength(2)
    expect(layout.columns[1].links[0].x1).toBe(layout.columns[1].bars[0].x + layout.columns[1].bars[0].width)
  })

  it('keeps zero-width bands visible', () => {
    const flat = candidateChartLayout({
      candidates: [{ designation: 'X', bands: [{ kind: 'reference', min: 5, max: 5 }] }],
      window: { min: 0, max: 10 },
      interferenceLimit: 0,
    })
    expect(flat.columns[0].bars[0].height).toBe(2)
  })
})
