import { describe, expect, it } from 'vitest'
import { clearanceAt, clearanceShiftUmPerK, diameterGrowthUmPerK, joiningTempC } from './thermal'

describe('differential thermal expansion', () => {
  // Ø25 mm, Al 7075-T6 housing α 23.4, 42CrMo4 shaft α 11.1 µm/(m·K):
  // ΔC/ΔT = 25 mm × 10⁻³ m/mm × (23.4 − 11.1) µm/(m·K) = 0.3075 µm/K
  it('Ø25 Al 7075 housing on a 42CrMo4 shaft opens by 0.3075 µm/K', () => {
    expect(clearanceShiftUmPerK(25, 23.4, 11.1)).toBeCloseTo(0.3075, 10)
  })

  it('shifts H7/p6 (−35 … −1 µm at 20 °C) to +2 … +36 µm at 140 °C, as on the Fit advisor screen', () => {
    // 0.3075 µm/K × (140 − 20) K = 36.9 µm → −35 + 36.9 = 1.9, −1 + 36.9 = 35.9
    const hot = clearanceAt({ minUm: -35, maxUm: -1 }, 0.3075, 140)
    expect(hot).toEqual({ tempC: 140, minUm: 1.9, maxUm: 35.9 })
    // −20 °C: 0.3075 × (−40) = −12.3 µm
    expect(clearanceAt({ minUm: -35, maxUm: -1 }, 0.3075, -20)).toEqual({ tempC: -20, minUm: -47.3, maxUm: -13.3 })
  })

  it('does not move the fit when both parts have the same α', () => {
    const shift = clearanceShiftUmPerK(40, 11.1, 11.1)
    expect(shift).toBe(0)
    expect(clearanceAt({ minUm: 9, maxUm: 50 }, shift, 300)).toEqual({ tempC: 300, minUm: 9, maxUm: 50 })
  })

  it('tightens the fit when the shaft expands more than the housing', () => {
    expect(clearanceShiftUmPerK(25, 11.1, 23.4)).toBeCloseTo(-0.3075, 10)
  })
})

describe('joining temperature', () => {
  it('heats a Ø25 Al 7075 housing by 102.6 K to gain 60 µm', () => {
    // Housing grows 25 × 10⁻³ × 23.4 = 0.585 µm/K; 60 µm / 0.585 µm/K = 102.56 K
    expect(diameterGrowthUmPerK(25, 23.4)).toBeCloseTo(0.585, 10)
    expect(joiningTempC(20, 60, 25, 23.4, 'heat')).toBeCloseTo(122.56, 2)
  })

  it('cools a Ø25 42CrMo4 shaft by 216.2 K to gain 60 µm', () => {
    // Shaft grows 25 × 10⁻³ × 11.1 = 0.2775 µm/K; 60 / 0.2775 = 216.22 K
    expect(joiningTempC(20, 60, 25, 11.1, 'cool')).toBeCloseTo(-196.22, 2)
  })

  it('returns null for a part that does not expand', () => {
    expect(joiningTempC(20, 60, 25, 0, 'heat')).toBeNull()
  })
})
