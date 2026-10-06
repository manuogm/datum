/**
 * Cross-checks of the fundamental deviation tables against the formulas that
 * ISO 286-1 used to build them (basis of the ISO system). The published values
 * are rounded, so these tests allow a few percent of difference: they are meant
 * to catch a mistyped table cell, not to recompute the tables.
 * D is the geometric mean of each size range, in mm; deviations are in µm.
 */
import { describe, expect, it } from 'vitest'
import { J_UPPER_DEVIATION_TABLES_UM } from './holeDeviations'
import {
  J_LOWER_DEVIATION_TABLES_UM, K_IT4_TO_IT7_LOWER_DEVIATION_UM,
  LOWER_DEVIATION_TABLES_UM, UPPER_DEVIATION_TABLES_UM,
} from './shaftDeviations'
import { valueForSize, type SizeTable } from './sizeTable'
import { expectOk, relativeDifference } from '../../../core/testing'
import { rowsWithMeanSize } from './testHelpers'
import { standardToleranceUm, type ToleranceGrade } from './toleranceGrades'

const IT = (grade: ToleranceGrade, sizeMm: number) => expectOk(standardToleranceUm(grade, sizeMm))

interface FormulaCheck {
  readonly table: SizeTable<number | null>
  /** Expected magnitude of the deviation (µm) for a range with mean size D, upper bound upToMm. */
  readonly formula: (D: number, upToMm: number) => number
  /** Only ranges over this size are checked (the smallest sizes were adjusted by hand). */
  readonly overMm?: number
  readonly maxRelativeDifference: number
}

function checkFormula(name: string, { table, formula, overMm = 0, maxRelativeDifference }: FormulaCheck) {
  for (const row of rowsWithMeanSize(table)) {
    if (row.value === null || row.overMm < overMm) continue
    const expected = formula(row.meanSizeMm, row.upToMm)
    expect(relativeDifference(Math.abs(row.value), expected), `${name} over ${row.overMm} up to ${row.upToMm} mm`)
      .toBeLessThan(maxRelativeDifference)
  }
}

const upper = UPPER_DEVIATION_TABLES_UM
const lower = LOWER_DEVIATION_TABLES_UM

describe('shafts a to h: es against the ISO 286-1 formulas', () => {
  it('a = 265 + 1.3·D up to 120 mm, 3.5·D above', () => checkFormula('a', {
    table: upper.a, formula: (D) => (D <= 120 ? 265 + 1.3 * D : 3.5 * D), maxRelativeDifference: 0.05,
  }))
  it('b = 140 + 0.85·D up to 160 mm, 1.8·D above', () => checkFormula('b', {
    table: upper.b, formula: (D) => (D <= 160 ? 140 + 0.85 * D : 1.8 * D), maxRelativeDifference: 0.05,
  }))
  it('c = 95 + 0.8·D above 40 mm', () => checkFormula('c', {
    table: upper.c, formula: (D) => 95 + 0.8 * D, overMm: 40, maxRelativeDifference: 0.05,
  }))
  it('d = 16·D^0.44', () => checkFormula('d', {
    table: upper.d, formula: (D) => 16 * D ** 0.44, maxRelativeDifference: 0.06,
  }))
  it('e = 11·D^0.41', () => checkFormula('e', {
    table: upper.e, formula: (D) => 11 * D ** 0.41, maxRelativeDifference: 0.06,
  }))
  it('f = 5.5·D^0.41', () => checkFormula('f', {
    table: upper.f, formula: (D) => 5.5 * D ** 0.41, overMm: 3, maxRelativeDifference: 0.06,
  }))
  it('g = 2.5·D^0.34', () => checkFormula('g', {
    table: upper.g, formula: (D) => 2.5 * D ** 0.34, overMm: 3, maxRelativeDifference: 0.1,
  }))
  it('cd, ef, fg are the geometric means of their neighbours, within 1 µm', () => {
    for (const sizeMm of [2, 5, 8]) {
      const at = (table: SizeTable<number | null>) => Math.abs(valueForSize(table, sizeMm) ?? 0)
      expect(Math.abs(at(upper.cd) - Math.sqrt(at(upper.c) * at(upper.d)))).toBeLessThanOrEqual(1)
      expect(Math.abs(at(upper.ef) - Math.sqrt(at(upper.e) * at(upper.f)))).toBeLessThanOrEqual(1)
      expect(Math.abs(at(upper.fg) - Math.sqrt(at(upper.f) * at(upper.g)))).toBeLessThanOrEqual(1)
    }
  })
})

describe('shafts k to zc: ei against the ISO 286-1 formulas', () => {
  it('k (IT4 to IT7) = 0.6·∛D, rounded to whole µm, over 3 up to 500 mm', () => {
    for (const row of rowsWithMeanSize(K_IT4_TO_IT7_LOWER_DEVIATION_UM)) {
      if (row.overMm < 3 || row.upToMm > 500) continue
      expect(row.value, `k up to ${row.upToMm} mm`).toBe(Math.round(0.6 * Math.cbrt(row.meanSizeMm)))
    }
  })
  it('m = IT7 − IT6 over 3 up to 500 mm', () => {
    for (const row of rowsWithMeanSize(lower.m)) {
      if (row.overMm < 3 || row.upToMm > 500) continue
      expect(row.value, `m up to ${row.upToMm} mm`).toBe(IT('7', row.upToMm) - IT('6', row.upToMm))
    }
  })
  // Above 500 mm m follows 0.024·D + 12.6 only loosely (largest gap 5 %, at 2500–3150 mm).
  it('m = 0.024·D + 12.6 above 500 mm', () => checkFormula('m', {
    table: lower.m, formula: (D) => 0.024 * D + 12.6, overMm: 500, maxRelativeDifference: 0.055,
  }))
  it('n = 5·D^0.34 up to 500 mm, 0.04·D + 21 above', () => checkFormula('n', {
    table: lower.n, formula: (D) => (D <= 500 ? 5 * D ** 0.34 : 0.04 * D + 21), overMm: 3, maxRelativeDifference: 0.06,
  }))
  it('p = IT7 + 0 to 5 µm over 18 up to 500 mm, 0.072·D + 37.8 above', () => {
    for (const row of rowsWithMeanSize(lower.p)) {
      const p = row.value ?? 0
      if (row.overMm < 18) continue
      if (row.upToMm <= 500) {
        expect(p - IT('7', row.upToMm), `p up to ${row.upToMm} mm`).toBeGreaterThanOrEqual(0)
        expect(p - IT('7', row.upToMm), `p up to ${row.upToMm} mm`).toBeLessThanOrEqual(5)
      } else {
        expect(relativeDifference(p, 0.072 * row.meanSizeMm + 37.8), `p up to ${row.upToMm} mm`).toBeLessThan(0.03)
      }
    }
  })
  it('r = geometric mean of p and s', () => {
    for (const row of rowsWithMeanSize(lower.r)) {
      if (row.overMm < 18) continue
      const p = valueForSize(lower.p, row.upToMm) ?? 0
      const s = valueForSize(lower.s, row.upToMm) ?? 0
      expect(relativeDifference(row.value ?? 0, Math.sqrt(p * s)), `r up to ${row.upToMm} mm`).toBeLessThan(0.04)
    }
  })
  it('s = IT8 + 1 to 4 µm over 3 up to 50 mm, IT7 + 0.4·D above', () => {
    for (const row of rowsWithMeanSize(lower.s)) {
      const s = row.value ?? 0
      if (row.overMm < 3) continue
      if (row.upToMm <= 50) {
        expect(s - IT('8', row.upToMm), `s up to ${row.upToMm} mm`).toBeGreaterThanOrEqual(1)
        expect(s - IT('8', row.upToMm), `s up to ${row.upToMm} mm`).toBeLessThanOrEqual(4)
      } else {
        expect(relativeDifference(s, IT('7', row.upToMm) + 0.4 * row.meanSizeMm), `s up to ${row.upToMm} mm`).toBeLessThan(0.03)
      }
    }
  })

  const itPlus = (grade: ToleranceGrade, factor: number) => (D: number, upToMm: number) => IT(grade, upToMm) + factor * D
  it.each([
    ['t', 'IT7 + 0.63·D', itPlus('7', 0.63)],
    ['u', 'IT7 + D', itPlus('7', 1)],
    ['v', 'IT7 + 1.25·D', itPlus('7', 1.25)],
    ['x', 'IT7 + 1.6·D', itPlus('7', 1.6)],
    ['y', 'IT7 + 2·D', itPlus('7', 2)],
    ['z', 'IT7 + 2.5·D', itPlus('7', 2.5)],
    ['za', 'IT8 + 3.15·D', itPlus('8', 3.15)],
    ['zb', 'IT9 + 4·D', itPlus('9', 4)],
    ['zc', 'IT10 + 5·D', itPlus('10', 5)],
  ] as const)('%s = %s over 30 mm', (letter, _, formula) => checkFormula(letter, {
    table: lower[letter], formula, overMm: 30, maxRelativeDifference: 0.03,
  }))
})

describe('j and J tables are consistent with each other (via Δ = ITn − IT(n−1))', () => {
  const sizes = [5, 8, 15, 25, 40, 60, 100, 150, 200, 300, 350, 450]
  const ei = (table: SizeTable<number>, sizeMm: number) => valueForSize(table, sizeMm) ?? Number.NaN
  const delta = (grade: ToleranceGrade, finer: ToleranceGrade, sizeMm: number) => IT(grade, sizeMm) - IT(finer, sizeMm)
  it.each(sizes)('at %d mm: J6 = −ei(j6) + Δ6, J7 = −ei(j6) + Δ7, J8 = −ei(j7) + Δ8', (sizeMm) => {
    const j6 = ei(J_LOWER_DEVIATION_TABLES_UM['IT5 and IT6'], sizeMm)
    const j7 = ei(J_LOWER_DEVIATION_TABLES_UM.IT7, sizeMm)
    expect(ei(J_UPPER_DEVIATION_TABLES_UM.IT6, sizeMm)).toBe(-j6 + delta('6', '5', sizeMm))
    expect(ei(J_UPPER_DEVIATION_TABLES_UM.IT7, sizeMm)).toBe(-j6 + delta('7', '6', sizeMm))
    expect(ei(J_UPPER_DEVIATION_TABLES_UM.IT8, sizeMm)).toBe(-j7 + delta('8', '7', sizeMm))
  })
})
