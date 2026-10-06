import { describe, expect, it } from 'vitest'
import { parseZone } from './designation'
import { analyseFit, analyseFitDesignation } from './fitAnalysis'
import { PREFERRED_FITS } from './preferredFits'
import { expectError, expectOk } from '../../../core/testing'

const fit = (designation: string, sizeMm: number) => expectOk(analyseFitDesignation(designation, sizeMm))

describe('analyseFit', () => {
  it.each([
    // [fit, size, max clearance, min clearance, type] (µm; negative = interference)
    ['H7/g6', 25, 41, 7, 'clearance'],
    ['H7/h6', 25, 34, 0, 'clearance'],
    ['H8/f7', 40, 89, 25, 'clearance'],
    ['H7/k6', 25, 19, -15, 'transition'],
    ['H7/n6', 25, 6, -28, 'transition'],
    ['H7/p6', 25, -1, -35, 'interference'],
    ['H7/s6', 50, -18, -59, 'interference'],
    ['H7/p6', 2, 4, -12, 'transition'], // up to 3 mm H7/p6 is not an interference fit
  ] as const)('%s at %d mm: %d / %d µm, %s', (designation, sizeMm, max, min, type) => {
    const result = fit(designation, sizeMm)
    expect([result.maxClearanceUm, result.minClearanceUm, result.fitType]).toEqual([max, min, type])
  })

  it('gives mean clearance and fit tolerance (= IT hole + IT shaft)', () => {
    const result = fit('H7/g6', 25)
    expect(result.meanClearanceUm).toBe(24)
    expect(result.fitToleranceUm).toBe(34)
    expect(result.fitToleranceUm).toBe(result.hole.itUm + result.shaft.itUm)
    expect(result.designation).toBe('H7/g6')
  })

  it('treats a fit that just touches at one limit as clearance or interference', () => {
    expect(fit('H7/h6', 25).fitType).toBe('clearance') // min clearance exactly 0
    expect(fit('H6/n5', 25).maxClearanceUm).toBe(13 - 15) // −2: interference
    expect(fit('H6/n5', 25).fitType).toBe('interference')
  })

  it('returns an explanation for undefined or swapped classes', () => {
    expect(expectError(analyseFitDesignation('H7/t6', 20))).toMatch(/t6/)
    expectError(analyseFit(expectOk(parseZone('g6')), expectOk(parseZone('H7')), 25))
    expectError(analyseFitDesignation('H7', 25))
  })
})

describe('hole-basis and shaft-basis fits are equivalent over 3 up to 500 mm', () => {
  // The special rule ES = −ei + Δ exists so that e.g. P7/h6 gives the same fit as H7/p6.
  const sizesMm = [4, 8, 12, 25, 40, 60, 90, 130, 200, 260, 330, 480]
  const pairs = [
    ['H7/k6', 'K7/h6'], ['H7/m6', 'M7/h6'], ['H7/n6', 'N7/h6'], ['H7/p6', 'P7/h6'], ['H7/r6', 'R7/h6'],
    ['H7/s6', 'S7/h6'], ['H7/u6', 'U7/h6'], ['H8/k7', 'K8/h7'], ['H8/n7', 'N8/h7'], ['H6/p5', 'P6/h5'],
    ['H7/g6', 'G7/h6'], ['H8/f7', 'F8/h7'], ['H9/d9', 'D9/h9'], ['H11/c11', 'C11/h11'],
  ] as const
  it.each(pairs)('%s ≡ %s', (holeBasis, shaftBasis) => {
    for (const sizeMm of sizesMm) {
      const a = fit(holeBasis, sizeMm)
      const b = fit(shaftBasis, sizeMm)
      expect([b.maxClearanceUm, b.minClearanceUm], `${sizeMm} mm`).toEqual([a.maxClearanceUm, a.minClearanceUm])
    }
  })
})

describe('preferred fits', () => {
  it('lists ten hole-basis and nine shaft-basis fits (H7/h6 once)', () => {
    expect(PREFERRED_FITS.filter((f) => f.basis === 'hole-basis')).toHaveLength(10)
    expect(PREFERRED_FITS.filter((f) => f.basis === 'shaft-basis')).toHaveLength(9)
  })

  it.each(PREFERRED_FITS.map((f) => [f.designation, f.name] as const))('%s (%s) is defined from 1 to 500 mm', (designation) => {
    for (const sizeMm of [1.5, 10, 25, 100, 500]) {
      expect(analyseFitDesignation(designation, sizeMm).ok, `${designation} at ${sizeMm} mm`).toBe(true)
    }
  })
})
