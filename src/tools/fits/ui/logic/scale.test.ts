import { describe, expect, it } from 'vitest'
import { niceAxis, niceStep, scaleLinear } from './scale'

describe('niceStep', () => {
  it('picks 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(140, 8)).toBe(20)
    expect(niceStep(41, 8)).toBe(10)
    expect(niceStep(60, 12)).toBe(5)
    expect(niceStep(1.2, 6)).toBe(0.2)
    expect(niceStep(1.4, 6)).toBe(0.25)
    expect(niceStep(400, 8)).toBe(50)
  })
})

describe('niceAxis', () => {
  it('encloses the data in whole steps', () => {
    const axis = niceAxis([-40, 0, 77.9, 40], 8)
    expect(axis).toMatchObject({ min: -40, max: 80, step: 20 })
    expect(axis.ticks).toEqual([-40, -20, 0, 20, 40, 60, 80])
  })

  it('has no floating-point noise in ticks', () => {
    expect(niceAxis([0, 0.9], 3).ticks).toEqual([0, 0.5, 1])
    expect(niceAxis([-0.3, 0.3], 6).ticks).toEqual([-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3])
  })

  it('widens a single value', () => {
    expect(niceAxis([0, 0], 4)).toMatchObject({ min: -1, max: 1 })
  })
})

describe('scaleLinear', () => {
  it('maps values onto an inverted SVG y range', () => {
    const y = scaleLinear({ min: -40, max: 100 }, 430, 22)
    expect(y(-40)).toBe(430)
    expect(y(100)).toBe(22)
    expect(y(0)).toBeCloseTo(430 - (40 / 140) * 408)
  })
})
