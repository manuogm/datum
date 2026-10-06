import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS, DEFAULT_PATTERN } from '../state/boltInputs'
import { PATTERN_MISSING_THREAD } from '../testFixtures'
import { boltResults } from './boltResults'
import { PLAN_FRAME as FRAME, planInputOf, planLayout, type PlanInput } from './patternPlan'

const SQUARE: PlanInput = {
  bolts: [
    { id: 'B1', xMm: -50, yMm: -50, nominalMm: 10, shearX: 1000, shearY: 0 },
    { id: 'B2', xMm: 50, yMm: -50, nominalMm: 10, shearX: 0, shearY: 500 },
    { id: 'B3', xMm: 50, yMm: 50, nominalMm: 4, shearX: 0, shearY: 0 },
    { id: 'B4', xMm: -50, yMm: 50, nominalMm: 10, shearX: 0, shearY: 0 },
  ],
  centroidMm: { x: 0, y: 0 },
  loadPointMm: { x: 0, y: 0 },
  inPlaneForce: { x: 0, y: 0 },
}

describe('planLayout', () => {
  it('centres the plate in the frame with y pointing up', () => {
    const layout = planLayout(SQUARE)
    expect(layout.plate.x + layout.plate.width / 2).toBeCloseTo(FRAME.width / 2)
    expect(layout.plate.y + layout.plate.height / 2).toBeCloseTo(FRAME.height / 2)
    const [b1, , , b4] = layout.bolts
    expect(b4.centre.y).toBeLessThan(b1.centre.y)
    expect(layout.centroid).toEqual({ x: FRAME.width / 2, y: FRAME.height / 2 })
  })

  it('keeps the plate inside the padding', () => {
    const { plate } = planLayout(SQUARE)
    expect(plate.x).toBeGreaterThanOrEqual(FRAME.padding - 1e-9)
    expect(plate.y).toBeGreaterThanOrEqual(FRAME.padding - 1e-9)
  })

  it('draws bigger threads bigger', () => {
    const [b1, , b3] = planLayout(SQUARE).bolts
    expect(b1.radius).toBeGreaterThan(b3.radius)
  })

  it('draws shear to one scale, along the force, and leaves out bolts without shear', () => {
    const [b1, b2, b3] = planLayout(SQUARE).bolts
    const length = (s: NonNullable<typeof b1.shear>) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1)
    expect(length(b1.shear!) / length(b2.shear!)).toBeCloseTo(2)
    expect(b1.shear!.x2).toBeGreaterThan(b1.shear!.x1)
    expect(b2.shear!.y2).toBeLessThan(b2.shear!.y1)
    expect(b3.shear).toBeNull()
  })

  it('gives a round force for the shear legend', () => {
    const { shearScale, bolts } = planLayout(SQUARE)
    expect(shearScale?.force).toBe(500)
    const longest = bolts[0].shear!
    expect(shearScale!.lengthPx).toBeCloseTo(Math.hypot(longest.x2 - longest.x1, longest.y2 - longest.y1) / 2)
  })

  it('has no shear legend or force arrow without loads', () => {
    const layout = planLayout({ ...SQUARE, bolts: SQUARE.bolts.map((b) => ({ ...b, shearX: 0, shearY: 0 })) })
    expect(layout.shearScale).toBeNull()
    expect(layout.force).toBeNull()
  })
})

describe('planInputOf', () => {
  it('shares the load case over the bolts even with a joint type left to complete', () => {
    const braking = DEFAULT_PATTERN.loadCases.find((c) => c.id === 'LC3')!
    const input = planInputOf(PATTERN_MISSING_THREAD.pattern, braking, null)
    expect(input.bolts).toHaveLength(8)
    expect(input.bolts[0].nominalMm).toBe(12)
    expect(input.bolts.some((b) => b.shearY !== 0)).toBe(true)
    expect(input.inPlaneForce).toEqual(braking.forceN)
  })

  it('draws the shear the analysis shares out, as in the results table', () => {
    const { loadCase, analysis } = boltResults(DEFAULT_BOLT_INPUTS, 'si').loadCases.find((c) => c.loadCase.id === 'LC3')!
    const shared = expectOk(analysis)
    const input = planInputOf(DEFAULT_PATTERN, loadCase, shared)
    expect(input.bolts.map((b) => Math.hypot(b.shearX, b.shearY))).toEqual(shared.bolts.map((b) => b.load.shearN))
  })
})
