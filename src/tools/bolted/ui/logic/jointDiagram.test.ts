import { describe, expect, it } from 'vitest'
import { JOINT_DIAGRAM_FRAME as FRAME, jointDiagramLayout, type Point } from './jointDiagram'

const INPUT = { boltResilience: 2e-6, loadFactor: 0.2, preload: 20_000, axial: 10_000 }

/** Height of a line at x, by linear interpolation. */
const yOnLine = (a: Point, b: Point, x: number) => a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)

describe('jointDiagramLayout', () => {
  it('splits FA into the extra bolt force and the residual clamp load', () => {
    const layout = jointDiagramLayout(INPUT)
    expect(layout.separated).toBe(false)
    expect(layout.forces.bolt).toBeCloseTo(22_000)
    expect(layout.forces.residual).toBeCloseTo(12_000)
    expect(layout.forces.separationAxial).toBeCloseTo(25_000)
  })

  it('puts the top of FA on the bolt line and its foot on the parts line', () => {
    const { bolt, parts, load } = jointDiagramLayout(INPUT)
    const boltLine = [{ x: bolt.x1, y: bolt.y1 }, { x: bolt.x2, y: bolt.y2 }] as const
    const partsLine = [{ x: parts.x1, y: parts.y1 }, { x: parts.x2, y: parts.y2 }] as const
    expect(yOnLine(...boltLine, load.x2)).toBeCloseTo(load.y2)
    expect(yOnLine(...partsLine, load.x1)).toBeCloseTo(load.y1)
    expect(load.x1).toBeCloseTo(load.x2)
  })

  it('starts the parts line at the preload point on the bolt line and ends it on the axis', () => {
    const layout = jointDiagramLayout(INPUT)
    expect(layout.parts.x1).toBe(layout.preload.x)
    expect(layout.separation.y).toBeCloseTo(FRAME.bottom)
    expect(layout.bolt).toMatchObject({ x1: FRAME.left, y1: FRAME.bottom })
  })

  it('stays inside the frame', () => {
    const { bolt, separation, forceTicks } = jointDiagramLayout(INPUT)
    expect(Math.max(bolt.x2, separation.x)).toBeLessThanOrEqual(FRAME.right)
    expect(forceTicks[0].y).toBe(FRAME.bottom)
    expect(forceTicks[forceTicks.length - 1].y).toBe(FRAME.top)
  })

  it('carries the whole load in the bolt once the parts separate', () => {
    const layout = jointDiagramLayout({ ...INPUT, axial: 30_000 })
    expect(layout.separated).toBe(true)
    expect(layout.forces).toMatchObject({ bolt: 30_000, residual: 0 })
    expect(layout.residual.y1).toBe(layout.residual.y2)
  })

  it('keeps separation finite for a load factor of 1', () => {
    expect(Number.isFinite(jointDiagramLayout({ ...INPUT, loadFactor: 1 }).separation.x)).toBe(true)
  })
})
