/**
 * Outcome of a calculation or lookup that can be asked something undefined
 * (e.g. "t6 at 10 mm" in ISO 286, or an unknown material id). Instead of
 * throwing, functions return either the value or a plain-English explanation
 * that the UI can show as-is. Shared by every tool.
 */
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function fail(error: string): Result<never> {
  return { ok: false, error }
}
