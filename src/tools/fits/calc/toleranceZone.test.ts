/**
 * Worked examples: limit deviations as listed in ISO 286-2:2010 (and identical
 * in the many handbooks that reproduce it). Each case is [class, size mm, upper µm, lower µm].
 */
import { describe, expect, it } from 'vitest'
import { parseZone } from './designation'
import { expectError, expectOk } from '../../../core/testing'
import { toleranceZone, toleranceZoneFor } from './toleranceZone'

const zone = (designation: string, sizeMm: number) => toleranceZoneFor(expectOk(parseZone(designation)), sizeMm)
const deviations = (designation: string, sizeMm: number) => {
  const { upperDeviationUm, lowerDeviationUm } = expectOk(zone(designation, sizeMm))
  return [upperDeviationUm, lowerDeviationUm]
}

describe('shaft tolerance zones', () => {
  it.each([
    ['g6', 25, -7, -20], ['k6', 25, 15, 2], ['p6', 25, 35, 22], ['h6', 25, 0, -13],
    ['f7', 40, -25, -50], ['s6', 50, 59, 43], ['s6', 60, 72, 53], ['s6', 70, 78, 59],
    ['c11', 25, -110, -240], ['d9', 25, -65, -117], ['e8', 25, -40, -73], ['js6', 25, 6.5, -6.5],
    ['j6', 25, 9, -4], ['j7', 25, 13, -8], ['m6', 25, 21, 8], ['n6', 25, 28, 15], ['r6', 25, 41, 28],
    ['u6', 20, 54, 41], ['u6', 25, 61, 48], ['t6', 25, 54, 41], ['x6', 2, 26, 20], ['a11', 2, -270, -330],
    ['h7', 600, 0, -70], ['k6', 600, 44, 0], ['g6', 1000, -26, -82], ['e9', 3000, -290, -830],
    ['cd7', 5, -46, -58], ['fg4', 8, -8, -12], ['k6', 3, 6, 0], ['k6', 4, 9, 1], ['k8', 25, 33, 0],
  ] as const)('%s at %d mm = %d / %d µm', (designation, sizeMm, upper, lower) => {
    expect(deviations(designation, sizeMm)).toEqual([upper, lower])
  })
})

describe('hole tolerance zones', () => {
  it.each([
    ['H7', 25, 21, 0], ['H8', 40, 39, 0], ['H11', 25, 130, 0], ['G7', 25, 28, 7], ['F8', 25, 53, 20],
    ['D9', 25, 117, 65], ['C11', 25, 240, 110], ['JS7', 25, 10.5, -10.5], ['J7', 25, 12, -9],
    ['J6', 25, 8, -5], ['J8', 25, 20, -13],
    // K, M, N up to IT8 and P to ZC up to IT7: special rule ES = −ei + Δ
    ['N7', 10, -4, -19], ['M7', 30, 0, -21], ['K7', 100, 10, -25], ['P7', 6, -8, -20],
    ['K6', 25, 2, -11], ['K8', 25, 10, -23], ['N6', 25, -11, -24], ['M7', 280, 0, -52],
    ['P7', 50, -17, -42], ['S7', 25, -27, -48], ['S7', 100, -58, -93], ['U7', 25, -40, -61],
    ['T7', 25, -33, -54], ['R7', 25, -20, -41],
    // P to ZC above IT7: general rule ES = −ei
    ['P8', 25, -22, -55],
    // up to 3 mm Δ = 0
    ['P7', 2, -6, -16], ['K7', 2, 0, -10], ['M7', 2, -2, -12], ['N7', 2, -4, -14],
    // M6 over 250 up to 315 mm: special case ES = −9 µm
    ['M6', 280, -9, -41],
    // N above IT8: ES = 0 over 3 up to 500 mm, −4 µm up to 3 mm
    ['N9', 20, 0, -52], ['N9', 2, -4, -29], ['M9', 20, -8, -60],
    // above 500 mm: no Δ
    ['P7', 600, -78, -148], ['M7', 600, -26, -96], ['N7', 600, -44, -114], ['K7', 600, 0, -70],
  ] as const)('%s at %d mm = %d / %d µm', (designation, sizeMm, upper, lower) => {
    expect(deviations(designation, sizeMm)).toEqual([upper, lower])
  })
})

describe('nominal sizes on range boundaries belong to the lower range', () => {
  it.each([
    ['H7', 30, 21, 0], ['H7', 30.001, 25, 0], ['g6', 30, -7, -20], ['g6', 30.01, -9, -25],
    ['s6', 50, 59, 43], ['s6', 50.5, 72, 53], ['u6', 24, 54, 41], ['u6', 24.5, 61, 48],
    ['H7', 3, 10, 0], ['H7', 500, 63, 0], ['H7', 500.1, 70, 0],
  ] as const)('%s at %d mm = %d / %d µm', (designation, sizeMm, upper, lower) => {
    expect(deviations(designation, sizeMm)).toEqual([upper, lower])
  })
})

describe('toleranceZone result', () => {
  it('gives IT, fundamental deviation and limits of size', () => {
    expect(expectOk(toleranceZone('shaft', 'g', 6, 25))).toEqual({
      kind: 'shaft', letter: 'g', grade: '6', designation: 'g6', nominalMm: 25,
      itUm: 13, fundamentalDeviationUm: -7, upperDeviationUm: -7, lowerDeviationUm: -20,
      maxSizeMm: 24.993, minSizeMm: 24.98,
    })
  })

  it('accepts the grade as number, "7" or "IT7", and the letter in either case', () => {
    const expected = expectOk(toleranceZone('hole', 'H', 7, 25))
    expect(expectOk(toleranceZone('hole', 'h', 'IT7', 25))).toEqual(expected)
    expect(expectOk(toleranceZone('hole', 'H', '7', 25))).toEqual(expected)
    expect(expected.maxSizeMm).toBe(25.021)
  })

  it('uses the fundamental deviation closest to zero: EI for H, ES for K', () => {
    expect(expectOk(zone('H7', 25)).fundamentalDeviationUm).toBe(0)
    expect(expectOk(zone('K7', 100)).fundamentalDeviationUm).toBe(10)
  })

  it('handles fractional micrometres without floating-point noise', () => {
    expect(deviations('js2', 25)).toEqual([1.25, -1.25])
    expect(deviations('h01', 20)).toEqual([0, -0.6])
    expect(deviations('K3', 5)).toEqual([0, -2.5])
  })
})

describe('combinations the standard does not define return an explanation', () => {
  it.each([
    ['t6', 20, /t6/], ['T7', 20, /T7/], ['v6', 10, /v6/], ['y6', 15, /y6/],
    ['a11', 1, /a11/], ['B11', 0.5, /B11/], ['z6', 600, /z6/], ['c11', 600, /c11/],
    ['cd7', 12, /cd7/], ['EF7', 12, /EF7/], ['j6', 600, /j6/], ['j9', 25, /j9/], ['J9', 25, /J9/],
    ['K9', 10, /K9/], ['N9', 0.8, /N9/], ['h14', 1, /IT14/], ['H0', 600, /IT0/], ['P2', 25, /Δ/],
    ['H7', 0, /greater than 0/], ['H7', 3151, /3150/], ['H7', Number.NaN, /number/],
  ] as const)('%s at %d mm', (designation, sizeMm, message) => {
    expect(expectError(zone(designation, sizeMm))).toMatch(message)
  })

  it('rejects unknown letters and grades', () => {
    expect(expectError(toleranceZone('hole', 'I', 7, 25))).toMatch(/letter/)
    expect(expectError(toleranceZone('shaft', 'g', 19, 25))).toMatch(/grade/)
  })
})
