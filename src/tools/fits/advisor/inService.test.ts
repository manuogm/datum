import { describe, expect, it } from 'vitest'
import { inServiceClearance, shareInside, windowStatus } from './inService'

describe('in-service clearance and the required window', () => {
  it('gives the clearance at both ends of the service range and the range over it', () => {
    // H7/p6 Ø25 (−35 … −1 µm at 20 °C), 0.3075 µm/K (Al 7075 housing, 42CrMo4 shaft), −20 … 140 °C
    const result = inServiceClearance({ minUm: -35, maxUm: -1 }, 0.3075, { minC: -20, maxC: 140 }, { minUm: 0, maxUm: 40 })
    expect(result.atServiceMin).toEqual({ tempC: -20, minUm: -47.3, maxUm: -13.3 })
    expect(result.atServiceMax).toEqual({ tempC: 140, minUm: 1.9, maxUm: 35.9 })
    expect(result.inServiceUm).toEqual({ minUm: -47.3, maxUm: 35.9 })
    expect(result.windowShare).toBeCloseTo(35.9 / 83.2, 10)
    expect(result.windowStatus).toBe('warn')
  })

  const window = { minUm: 0, maxUm: 40 }
  it.each([
    ['inside, touching both limits from the inside', { minUm: 0, maxUm: 40 }, 1, 'pass'],
    ['inside, touching the lower limit (H7/h6: min clearance 0)', { minUm: 0, maxUm: 34 }, 1, 'pass'],
    ['partly inside', { minUm: -10, maxUm: 30 }, 0.75, 'warn'],
    ['touching the lower limit from outside', { minUm: -34, maxUm: 0 }, 0, 'fail'],
    ['entirely outside', { minUm: 50, maxUm: 80 }, 0, 'fail'],
  ] as const)('%s', (_, actual, share, status) => {
    expect(shareInside(actual, window)).toBe(share)
    expect(windowStatus(shareInside(actual, window))).toBe(status)
  })
})
