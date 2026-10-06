import { describe, expect, it } from 'vitest'
import { expectError, expectOk, relativeDifference } from '../../../core/testing'
import { rowsWithMeanSize } from './testHelpers'
import {
  STANDARD_TOLERANCE_TABLE_UM, TOLERANCE_GRADES, nominalSizeRange, standardToleranceUm, type ToleranceGrade,
} from './toleranceGrades'

const it_ = (grade: ToleranceGrade, sizeMm: number) => expectOk(standardToleranceUm(grade, sizeMm))

describe('standard tolerances (ISO 286-1 Table 1)', () => {
  it.each([
    ['7', 25, 21], ['6', 10, 9], ['8', 40, 39], ['5', 2, 4], ['9', 18, 43], ['10', 65, 120],
    ['11', 100, 220], ['12', 250, 460], ['13', 300, 810], ['16', 50, 1600], ['18', 500, 9700],
    ['01', 400, 3], ['0', 120, 1.5], ['1', 3000, 26], ['7', 700, 80], ['18', 3150, 33000],
  ] as const)('IT%s at %d mm = %d µm', (grade, sizeMm, expectedUm) => {
    expect(it_(grade, sizeMm)).toBe(expectedUm)
  })

  it('puts a size on a range boundary in the lower range', () => {
    expect(it_('7', 30)).toBe(21) // over 18 up to and including 30
    expect(it_('7', 30.001)).toBe(25) // over 30 up to 50
    expect(it_('7', 3)).toBe(10)
    expect(it_('7', 500)).toBe(63)
    expect(it_('7', 500.5)).toBe(70)
  })

  it('refuses IT14 to IT18 up to 1 mm, but allows them above', () => {
    expect(expectError(standardToleranceUm('14', 1))).toMatch(/IT14/)
    expect(it_('14', 1.01)).toBe(250)
  })

  it('refuses IT01 and IT0 above 500 mm and sizes outside 0 < D ≤ 3150 mm', () => {
    expectError(standardToleranceUm('0', 600))
    expectError(standardToleranceUm('01', 501))
    expectError(standardToleranceUm('7', 0))
    expectError(standardToleranceUm('7', 3151))
    expectError(standardToleranceUm('7', Number.NaN))
  })

  it('grows with grade and with size', () => {
    const rows = STANDARD_TOLERANCE_TABLE_UM.map(([, values]) => values)
    rows.forEach((values, rowIndex) => {
      const defined = values.filter((value) => value !== null)
      defined.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(defined[i]))
      if (rowIndex > 0) {
        values.forEach((value, column) => {
          const previous = rows[rowIndex - 1][column]
          if (value !== null && previous !== null) expect(value).toBeGreaterThanOrEqual(previous)
        })
      }
    })
  })

  // Cross-check against the formulas the table was built from (ISO 286-1, basis of
  // the system): IT = factor × i, i = 0.45·∛D + 0.001·D (µm) up to 500 mm, and
  // IT = factor × I, I = 0.004·D + 2.1 (µm) above 500 mm, D = geometric mean of the range.
  // The published values are rounded, so a small relative difference is allowed
  // (10 %; 16 % for the first range up to 3 mm, whose values were rounded up more).
  // This catches typing errors in the table, not rounding.
  it('IT5 to IT18 agree with the formulas within rounding', () => {
    const factorsUpTo500 = [7, 10, 16, 25, 40, 64, 100, 160, 250, 400, 640, 1000, 1600, 2500]
    const factorsAbove500 = [2, 2.7, 3.7, 5, ...factorsUpTo500]
    for (const row of rowsWithMeanSize(STANDARD_TOLERANCE_TABLE_UM)) {
      const D = row.meanSizeMm
      const above500 = row.overMm >= 500
      const unit = above500 ? 0.004 * D + 2.1 : 0.45 * Math.cbrt(D) + 0.001 * D
      const firstGrade = above500 ? '1' : '5'
      const factors = above500 ? factorsAbove500 : factorsUpTo500
      factors.forEach((factor, i) => {
        const column = TOLERANCE_GRADES.indexOf(firstGrade) + i
        const tabulated = row.value[column]
        expect(tabulated, `IT${TOLERANCE_GRADES[column]} up to ${row.upToMm} mm`).not.toBeNull()
        expect(relativeDifference(tabulated ?? 0, factor * unit), `IT${TOLERANCE_GRADES[column]} up to ${row.upToMm} mm`)
          .toBeLessThan(row.upToMm === 3 ? 0.16 : 0.1)
      })
    }
  })
})

describe('nominalSizeRange (ISO 286-1 Table 1 ranges)', () => {
  it('finds the range a size belongs to, boundaries in the lower range', () => {
    expect(expectOk(nominalSizeRange(25))).toEqual({ overMm: 18, upToMm: 30 })
    expect(expectOk(nominalSizeRange(30))).toEqual({ overMm: 18, upToMm: 30 })
    expect(expectOk(nominalSizeRange(2))).toEqual({ overMm: 0, upToMm: 3 })
    expect(expectOk(nominalSizeRange(3150))).toEqual({ overMm: 2500, upToMm: 3150 })
  })

  it('explains sizes outside ISO 286', () => {
    expect(expectError(nominalSizeRange(0))).toMatch(/greater than 0/)
    expect(expectError(nominalSizeRange(4000))).toMatch(/3150/)
  })
})
