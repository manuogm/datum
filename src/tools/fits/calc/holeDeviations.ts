import { notTabulatedMessage, type FundamentalDeviation } from './fundamentalDeviation'
import type { DeviationLetter } from './letters'
import { fail, ok, type Result } from './result'
import { isUpperDeviationLetter, K_IT4_TO_IT7_LOWER_DEVIATION_UM, shaftFundamentalDeviation } from './shaftDeviations'
import { valueForSize, type SizeTable } from './sizeTable'
import { SOURCE } from './sources'
import { finerGrade, gradeNumber, standardToleranceUm, type ToleranceGrade } from './toleranceGrades'
import { roundUm } from './units'

/**
 * Upper deviation ES (µm) of hole J, which exists only for IT6, IT7 and IT8 up to 500 mm.
 * Source: ISO 286-1:2010, holes table, columns "J, IT6", "J, IT7", "J, IT8".
 * (Consistency check in the tests: J6 = −ei(j6) + Δ6, J7 = −ei(j6) + Δ7, J8 = −ei(j7) + Δ8.)
 */
export const J_UPPER_DEVIATION_TABLES_UM = {
  IT6: [[3, 2], [6, 5], [10, 5], [18, 6], [30, 8], [50, 10], [80, 13], [120, 16], [180, 18],
    [250, 22], [315, 25], [400, 29], [500, 33]],
  IT7: [[3, 4], [6, 6], [10, 8], [18, 10], [30, 12], [50, 14], [80, 18], [120, 22], [180, 26],
    [250, 30], [315, 36], [400, 39], [500, 43]],
  IT8: [[3, 6], [6, 10], [10, 12], [18, 15], [30, 20], [50, 24], [80, 28], [120, 34], [180, 41],
    [250, 47], [315, 55], [400, 60], [500, 66]],
} satisfies Record<string, SizeTable<number>>

/**
 * Δ (µm) for the special rule for holes of ISO 286-1:2010:
 * Δ = ITn − IT(n−1), the difference between the hole grade and the next finer grade.
 *
 * The holes table tabulates Δ for IT3 to IT8 over 3 mm up to 500 mm; for sizes up to
 * 3 mm Δ = 0, and above 500 mm the special rule does not apply (Δ = 0).
 * Computing Δ from Table 1 reproduces every tabulated Δ value exactly.
 */
function deltaUm(grade: ToleranceGrade, nominalMm: number, symbol: string): Result<number> {
  if (nominalMm <= 3 || nominalMm > 500) return ok(0)
  const finer = finerGrade(grade)
  if (gradeNumber(grade) < 3 || finer === undefined) {
    return fail(`${symbol}${grade} is not defined for a nominal size of ${nominalMm} mm: ${SOURCE.holes} gives Δ only for IT3 to IT8.`)
  }
  const it = standardToleranceUm(grade, nominalMm)
  const itFiner = standardToleranceUm(finer, nominalMm)
  if (!it.ok) return it
  if (!itFiner.ok) return itFiner
  return ok(roundUm(it.value - itFiner.value))
}

function upperDeviation(valueUm: number): Result<FundamentalDeviation> {
  return ok({ limit: 'upper', valueUm: roundUm(valueUm) })
}

/** ES = base + Δ (special rule for holes, ISO 286-1:2010). */
function upperWithDelta(baseUm: number, grade: ToleranceGrade, nominalMm: number, symbol: string): Result<FundamentalDeviation> {
  const delta = deltaUm(grade, nominalMm, symbol)
  return delta.ok ? upperDeviation(baseUm + delta.value) : delta
}

/** The shaft deviation of the same letter, which the hole rules mirror. */
function shaftLowerDeviationUm(letter: Exclude<DeviationLetter, 'js'>, grade: ToleranceGrade, nominalMm: number): Result<number> {
  const shaft = shaftFundamentalDeviation(letter, grade, nominalMm)
  if (!shaft.ok) return fail(notTabulatedMessage(letter.toUpperCase(), grade, nominalMm, SOURCE.holes))
  return ok(shaft.value.valueUm)
}

/**
 * K (ISO 286-1:2010 holes table, columns "K ≤ IT8" and "K > IT8"):
 * - up to 3 mm: ES = 0 for every grade;
 * - up to IT8: ES = −ei(k, IT4 to IT7 column) + Δ;
 * - above IT8 (sizes over 3 mm): not tabulated.
 */
function holeK(grade: ToleranceGrade, nominalMm: number): Result<FundamentalDeviation> {
  if (nominalMm <= 3) return upperDeviation(0)
  if (gradeNumber(grade) > 8) {
    return fail(`K${grade} is not defined for a nominal size of ${nominalMm} mm: ${SOURCE.holes} gives K above IT8 only up to 3 mm.`)
  }
  const kUm = valueForSize(K_IT4_TO_IT7_LOWER_DEVIATION_UM, nominalMm) ?? 0
  return upperWithDelta(-kUm, grade, nominalMm, 'K')
}

/**
 * M (ISO 286-1:2010 holes table, columns "M ≤ IT8" and "M > IT8"):
 * - up to IT8: ES = −ei(m) + Δ, with the special case M6 over 250 up to 315 mm: ES = −9 µm (not −11);
 * - above IT8: ES = −ei(m) (general rule).
 */
function holeM(grade: ToleranceGrade, nominalMm: number): Result<FundamentalDeviation> {
  const m = shaftLowerDeviationUm('m', grade, nominalMm)
  if (!m.ok) return m
  if (gradeNumber(grade) > 8) return upperDeviation(-m.value)
  if (grade === '6' && nominalMm > 250 && nominalMm <= 315) return upperDeviation(-9)
  return upperWithDelta(-m.value, grade, nominalMm, 'M')
}

/**
 * N (ISO 286-1:2010 holes table, columns "N ≤ IT8" and "N > IT8"):
 * - up to IT8: ES = −ei(n) + Δ;
 * - above IT8: ES = −4 µm up to 3 mm (not for sizes ≤ 1 mm, table note),
 *   ES = 0 over 3 up to 500 mm, ES = −ei(n) above 500 mm.
 */
function holeN(grade: ToleranceGrade, nominalMm: number): Result<FundamentalDeviation> {
  const n = shaftLowerDeviationUm('n', grade, nominalMm)
  if (!n.ok) return n
  if (gradeNumber(grade) <= 8) return upperWithDelta(-n.value, grade, nominalMm, 'N')
  if (nominalMm <= 1) {
    return fail(`N${grade} is not defined for a nominal size of ${nominalMm} mm: ${SOURCE.holes} does not allow N above IT8 for sizes up to 1 mm.`)
  }
  if (nominalMm > 3 && nominalMm <= 500) return upperDeviation(0)
  return upperDeviation(-n.value)
}

/**
 * P to ZC (ISO 286-1:2010 holes table): ES = −ei(shaft of the same letter),
 * plus Δ for grades up to IT7 (special rule).
 */
function holePToZC(letter: Exclude<DeviationLetter, 'js'>, grade: ToleranceGrade, nominalMm: number): Result<FundamentalDeviation> {
  const ei = shaftLowerDeviationUm(letter, grade, nominalMm)
  if (!ei.ok) return ei
  if (gradeNumber(grade) > 7) return upperDeviation(-ei.value)
  return upperWithDelta(-ei.value, grade, nominalMm, letter.toUpperCase())
}

/**
 * Fundamental deviation of a hole (every letter except JS, which is symmetric
 * and handled with the tolerance zone).
 *
 * ISO 286-1:2010 rules for holes:
 * - General rule: the hole deviation mirrors the shaft deviation of the same
 *   letter about the zero line. A to H: EI = −es.
 * - J: tabulated directly.
 * - K, M, N up to IT8 and P to ZC up to IT7: special rule ES = −ei + Δ,
 *   so that e.g. H7/p6 and P7/h6 give the same fit.
 */
export function holeFundamentalDeviation(
  letter: Exclude<DeviationLetter, 'js'>,
  grade: ToleranceGrade,
  nominalMm: number,
): Result<FundamentalDeviation> {
  if (isUpperDeviationLetter(letter)) {
    const es = shaftFundamentalDeviation(letter, grade, nominalMm)
    if (!es.ok) return fail(notTabulatedMessage(letter.toUpperCase(), grade, nominalMm, SOURCE.holes))
    return ok({ limit: 'lower', valueUm: roundUm(-es.value.valueUm) })
  }
  switch (letter) {
    case 'j':
      return holeJ(grade, nominalMm)
    case 'k':
      return holeK(grade, nominalMm)
    case 'm':
      return holeM(grade, nominalMm)
    case 'n':
      return holeN(grade, nominalMm)
    default:
      return holePToZC(letter, grade, nominalMm)
  }
}

function holeJ(grade: ToleranceGrade, nominalMm: number): Result<FundamentalDeviation> {
  const table = grade === '6' || grade === '7' || grade === '8' ? J_UPPER_DEVIATION_TABLES_UM[`IT${grade}`] : undefined
  const valueUm = table && valueForSize(table, nominalMm)
  if (valueUm === undefined) {
    return fail(`J${grade} is not defined for a nominal size of ${nominalMm} mm: ${SOURCE.holes} gives J only for J6, J7 and J8 up to 500 mm (use JS instead).`)
  }
  return upperDeviation(valueUm)
}
