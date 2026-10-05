// Helpers for tests of the pure engines: unwrapping Result values and
// comparing numbers recalled from standards within a relative tolerance.
import { expect } from 'vitest'
import type { Result } from './result'

/** Unwraps a Result in tests, failing with the engine's own message if it is an error. */
export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Expected a value but got: ${result.error}`)
  return result.value
}

/** The error message of a Result that must be an error. */
export function expectError<T>(result: Result<T>): string {
  expect(result.ok).toBe(false)
  return result.ok ? '' : result.error
}

/** |actual − expected| / |expected|. */
export function relativeDifference(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected)
}
