import { describe, expect, it } from 'vitest'
import { relativeDifference } from '../../../core/testing'
import { erfc, normalUpperTail } from '.'

// Reference values from Python's math.erfc (double precision).
describe('erfc and the normal tail (Numerical Recipes erfcc, fractional error < 1.2e-7)', () => {
  it.each([
    [0, 1],
    [1, 0.15729920705028513],
    [-0.5, 1.5204998778130465],
    [2.5, 0.0004069520174449589],
  ])('erfc(%f)', (x, expected) => {
    expect(relativeDifference(erfc(x), expected)).toBeLessThan(1.2e-7)
  })

  it.each([
    [-1, 0.8413447460685429],
    [3, 0.0013498980316300957],
    [4.5, 3.3976731247300615e-6],
    [6, 9.865876450377012e-10],
  ])('P(Z > %f)', (z, expected) => {
    expect(relativeDifference(normalUpperTail(z), expected)).toBeLessThan(1.2e-7)
  })
})
