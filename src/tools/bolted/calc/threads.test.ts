import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../core/testing'
import { boltDimensions } from './boltDimensions'
import { boltMaterial, PROPERTY_CLASSES } from './propertyClasses'
import { NOMINAL_DIAMETERS_MM, pitchesForMm, threadGeometry } from './threads'

describe('threadGeometry', () => {
  it.each([
    // [d, P, As] — stress areas as tabulated in ISO 898-1 (mm², rounded there to 3 significant figures)
    [3, undefined, 5.03], [4, undefined, 8.78], [5, undefined, 14.2], [6, undefined, 20.1], [8, undefined, 36.6],
    [10, undefined, 58.0], [12, undefined, 84.3], [16, undefined, 157], [20, undefined, 245], [24, undefined, 353],
    [30, undefined, 561], [36, undefined, 817], [8, 1, 39.2], [10, 1.25, 61.2], [12, 1.5, 88.1], [16, 1.5, 167], [20, 1.5, 272],
  ])('M%d (P %s) has As = %d mm²', (d, pitch, as) => {
    // ISO 898-1 rounds to 3 significant figures, so agreement to within half a unit of the third digit.
    expect(expectOk(threadGeometry(d, pitch)).stressAreaMm2).toBeCloseTo(as, as < 10 ? 2 : as < 100 ? 1 : 0)
  })

  it('gives the ISO 724 basic diameters of M10', () => {
    const t = expectOk(threadGeometry(10))
    // d2 = 10 − 0.649519 × 1.5 = 9.026, D1 = 10 − 1.082532 × 1.5 = 8.376, d3 = 10 − 1.226869 × 1.5 = 8.160
    expect(t.pitchDiameterMm).toBeCloseTo(9.026, 3)
    expect(t.nutMinorDiameterMm).toBeCloseTo(8.376, 3)
    expect(t.boltMinorDiameterMm).toBeCloseTo(8.160, 3)
    expect([t.designation, t.coarse]).toEqual(['M10', true])
    expect(expectOk(threadGeometry(10, 1.25)).designation).toBe('M10×1.25')
  })

  it('rejects sizes and pitches outside ISO 261 M3 … M36', () => {
    expect(expectError(threadGeometry(7))).toMatch(/M7/)
    expect(expectError(threadGeometry(42))).toMatch(/M3 to M36/)
    expect(expectError(threadGeometry(10, 2))).toMatch(/1.5, 1.25, 1, 0.75/)
  })

  it('lists the coarse pitch first', () => {
    expect(pitchesForMm(12)).toEqual([1.75, 1.5, 1.25, 1])
    expect(pitchesForMm(7)).toEqual([])
  })
})

describe('bolt dimensions and property classes', () => {
  it('holds dimensions for every covered size, with dh < dW and the washer wider than the head', () => {
    for (const d of NOMINAL_DIAMETERS_MM) {
      const dims = boltDimensions(d)
      expect(dims, `M${d}`).not.toBeNull()
      if (!dims) continue
      expect(dims.clearanceHoleMm).toBeGreaterThan(d)
      expect(dims.hexBearingMm).toBeGreaterThan(dims.clearanceHoleMm)
      expect(dims.socketBearingMm).toBeGreaterThan(dims.clearanceHoleMm)
      expect(dims.washer.outerMm).toBeGreaterThan(dims.socketBearingMm)
    }
  })

  it('gives ISO 898-1 minimums, with 8.8 stronger above M16', () => {
    expect(expectOk(boltMaterial('8.8', 16)).proofStressMPa).toBe(640)
    expect(expectOk(boltMaterial('8.8', 20)).proofStressMPa).toBe(660)
    expect(expectOk(boltMaterial('10.9', 10)).tensileStrengthMPa).toBe(1040)
    expect(expectOk(boltMaterial('12.9', 10)).proofStressMPa).toBe(1100)
    expect(expectOk(boltMaterial('A4-80', 10))).toMatchObject({ proofStressMPa: 600, tensileStrengthMPa: 800, stainless: true })
    for (const propertyClass of PROPERTY_CLASSES) expect(boltMaterial(propertyClass, 10).ok).toBe(true)
  })

  it('rejects an unknown property class', () => {
    expect(expectError(boltMaterial('14.9' as never, 10))).toMatch(/14.9/)
  })
})
