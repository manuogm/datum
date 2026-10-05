import { fail, ok, type Result } from '../../../core/result'

/** ISO 286-1:2010 covers nominal sizes up to and including 3150 mm. */
export const MAX_NOMINAL_SIZE_MM = 3150

/**
 * ISO 286-1 tables are organised by nominal size range, written
 * "over X up to and including Y" (ISO 286-1:2010, Tables 1 to 4).
 * A size exactly on a boundary therefore belongs to the LOWER range:
 * 30 mm is in "over 18 up to and including 30", not in "over 30 up to 50".
 *
 * A SizeTable lists those ranges as rows of [upToMm, value]. Each row starts
 * where the previous row ended; the first row starts at 0 mm. A `null` value
 * means the standard leaves that cell blank (not defined for that size).
 * Sizes beyond the last row are not covered by that table either.
 */
export type SizeTable<T> = readonly (readonly [upToMm: number, value: T])[]

/** The value of the row whose range contains `nominalMm`, or undefined if no row does. */
export function valueForSize<T>(table: SizeTable<T>, nominalMm: number): T | undefined {
  const row = table.find(([upToMm]) => nominalMm <= upToMm)
  return row?.[1]
}

/** Checks a user-entered nominal size: a number with 0 < D ≤ 3150 mm. */
export function checkNominalSize(nominalMm: number): Result<number> {
  if (!Number.isFinite(nominalMm)) {
    return fail('The nominal size must be a number in millimetres.')
  }
  if (nominalMm <= 0) {
    return fail('The nominal size must be greater than 0 mm.')
  }
  if (nominalMm > MAX_NOMINAL_SIZE_MM) {
    return fail(`ISO 286 covers nominal sizes up to ${MAX_NOMINAL_SIZE_MM} mm only.`)
  }
  return ok(nominalMm)
}
