import { expect } from 'vitest'
import type { Result } from '../../../core/result'
import type { SizeTable } from './sizeTable'

/** Unwraps a Result in tests, failing with the engine's own message if it is an error. */
export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Expected a value but got: ${result.error}`)
  return result.value
}

export function expectError<T>(result: Result<T>): string {
  expect(result.ok).toBe(false)
  return result.ok ? '' : result.error
}

/**
 * The rows of a SizeTable with both bounds and the size D used by the ISO 286
 * formulas: the geometric mean of the range bounds, with 1 mm as the lower
 * bound of the first range (ISO 286-1 basis of the system).
 */
export function rowsWithMeanSize<T>(table: SizeTable<T>) {
  return table.map(([upToMm, value], index) => {
    const overMm = index === 0 ? 0 : table[index - 1][0]
    return { overMm, upToMm, value, meanSizeMm: Math.sqrt(Math.max(overMm, 1) * upToMm) }
  })
}

export function relativeDifference(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected)
}
