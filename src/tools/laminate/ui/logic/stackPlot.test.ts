import { describe, expect, it } from 'vitest'
import { distinctAngles, fibreRotation, stackLayout } from './stackPlot'

describe('stackLayout', () => {
  it('draws the bottom ply first and spaces eight plies 48 apart from the top', () => {
    const plies = stackLayout([0, 45, -45, 90, 90, -45, 45, 0], [4, 5])
    expect(plies.map((p) => p.index)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
    expect(plies.at(-1)?.cy).toBe(64)
    expect(plies[0].cy).toBe(400)
    expect(plies.filter((p) => p.critical).map((p) => p.index)).toEqual([5, 4])
    expect(plies.every((p) => p.labelled)).toBe(true)
  })

  it('centres a thin stack and labels only some plies of a thick one', () => {
    const thin = stackLayout([0, 90], [])
    expect(thin.map((p) => p.cy)).toEqual([256, 208])
    const thick = stackLayout(Array.from({ length: 48 }, () => 0), [20])
    expect(thick.filter((p) => p.labelled).length).toBeLessThan(30)
    expect(thick.find((p) => p.index === 20)?.labelled).toBe(true)
  })
})

describe('fibres', () => {
  it('rotate against the angle in the ply plane, one pattern per angle', () => {
    expect(fibreRotation(45)).toBe('rotate(-45)')
    expect(distinctAngles([0, 45, -45, 135, 0])).toEqual([0, 45, -45])
  })
})
