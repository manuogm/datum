import { describe, expect, it } from 'vitest'
import { spectrumLayout } from './spectrum'

describe('spectrumLayout', () => {
  const layout = spectrumLayout(
    [
      { kind: 'cold', min: -5.3, max: 28.7 },
      { kind: 'reference', min: 7, max: 41 },
      { kind: 'hot', min: 43.9, max: 77.9 },
    ],
    { min: 0, max: 40 },
  )

  it('spans the strip with nice ticks around every value', () => {
    expect(layout.ticks[0]).toEqual({ value: -20, percent: 0 })
    expect(layout.ticks.at(-1)).toEqual({ value: 80, percent: 100 })
    expect(layout.zeroPercent).toBe(20)
  })

  it('places bands and the window by value', () => {
    expect(layout.window).toEqual({ left: 20, width: 40 })
    expect(layout.bars[1]).toEqual({ kind: 'reference', left: 27, width: 34 })
    expect(layout.bars.map((bar) => bar.kind)).toEqual(['cold', 'reference', 'hot'])
  })

  it('draws no window and fits the axis to the bands alone when none is set', () => {
    const bare = spectrumLayout([{ kind: 'reference', min: 65, max: 195 }], null)
    expect(bare.window).toBeNull()
    expect(bare.ticks.at(-1)?.value).toBeGreaterThanOrEqual(195)
  })
})
