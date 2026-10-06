import { describe, expect, it } from 'vitest'
import { COMPACT_FRAME, REPORT_FRAME, SCREEN_FRAME, zoneDiagramLayout } from './zoneDiagram'

// Ø25 H7/g6: hole +21 / 0 µm, shaft −7 / −20 µm.
const h7 = { upper: 21, lower: 0 }
const g6 = { upper: -7, lower: -20 }

describe('zoneDiagramLayout', () => {
  const layout = zoneDiagramLayout(h7, g6, SCREEN_FRAME)

  it('draws both zones to the same scale around the zero line', () => {
    expect(layout.hole.y + layout.hole.height).toBeCloseTo(layout.zeroY)
    const pxPerUm = layout.hole.height / 21
    expect(layout.shaft.height).toBeCloseTo(13 * pxPerUm)
    expect(layout.shaft.y - layout.zeroY).toBeCloseTo(7 * pxPerUm)
  })

  it('uses nice ticks that cover both zones', () => {
    expect(layout.ticks[0].value).toBeLessThanOrEqual(-20)
    expect(layout.ticks.at(-1)?.value).toBeGreaterThanOrEqual(21)
    expect(layout.ticks[0].y).toBe(SCREEN_FRAME.valueBottom)
  })

  it('measures min and max clearance between the right edges', () => {
    expect(layout.minDimension.value).toBe(7)
    expect(layout.maxDimension.value).toBe(41)
    expect(layout.minDimension.y1).toBeCloseTo(layout.zeroY)
    expect(layout.maxDimension.y2).toBeCloseTo(layout.shaft.y + layout.shaft.height)
  })

  it('reports interference as a negative clearance', () => {
    const p6 = { upper: 35, lower: 22 }
    const fit = zoneDiagramLayout(h7, p6, SCREEN_FRAME)
    expect(fit.minDimension.value).toBe(-35)
    expect(fit.maxDimension.value).toBe(-1)
  })

  it('names zones inside when tall enough, and spreads labels on thin zones', () => {
    expect(layout.hole.nameInside).toBe(true)
    const thin = zoneDiagramLayout({ upper: 4, lower: 0 }, { upper: 0, lower: -300 }, SCREEN_FRAME)
    expect(thin.hole.nameInside).toBe(false)
    expect(thin.hole.upperLabelY).toBeLessThan(thin.hole.y)
    expect(thin.hole.lowerLabelY).toBeGreaterThan(thin.hole.y + thin.hole.height)
    expect(thin.hole.height).toBeGreaterThanOrEqual(2)
  })

  it('fits the smaller report frame', () => {
    const report = zoneDiagramLayout(h7, g6, REPORT_FRAME)
    expect(report.ticks[0].y).toBe(REPORT_FRAME.valueBottom)
    expect(report.hole.x).toBe(REPORT_FRAME.holeX)
  })
})

describe('COMPACT_FRAME', () => {
  it('keeps the room the screen labels need: shaft limit labels clear of the hole, dimension labels inside the frame', () => {
    const f = COMPACT_FRAME
    expect(f.shaftX - (f.holeX + f.zoneWidth)).toBeGreaterThanOrEqual(50)
    expect(f.minDimensionX).toBeGreaterThan(f.shaftX + f.zoneWidth)
    expect(f.maxDimensionX - f.minDimensionX).toBeGreaterThanOrEqual(56)
    expect(f.maxDimensionX + 50).toBeLessThanOrEqual(f.width)
  })
})
