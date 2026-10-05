import { clearanceAt } from './thermal'
import type { CheckStatus, ClearanceAtTemperature, ClearanceRangeUm, TemperatureRangeC } from './types'

/** A fit over the service temperature range, judged against the required clearance window. */
export interface InServiceClearance {
  readonly atServiceMin: ClearanceAtTemperature
  readonly atServiceMax: ClearanceAtTemperature
  /** Smallest and largest clearance anywhere in the service temperature range. */
  readonly inServiceUm: ClearanceRangeUm
  /** Share (0 … 1) of the in-service range that lies inside the window. */
  readonly windowShare: number
  /** pass: all inside the window; warn: partly; fail: none. See windowStatus. */
  readonly windowStatus: CheckStatus
}

/**
 * The in-service clearance range of a fit and whether it stays inside the
 * required window. Clearance is linear in temperature, so its extremes over
 * the range are at the two ends (see clearanceAt for the thermal model).
 * Used by the advisor for every candidate, and by the screens for any fit.
 */
export function inServiceClearance(
  fitAt20C: ClearanceRangeUm, shiftUmPerK: number, serviceTempC: TemperatureRangeC, windowUm: ClearanceRangeUm,
): InServiceClearance {
  const atServiceMin = clearanceAt(fitAt20C, shiftUmPerK, serviceTempC.minC)
  const atServiceMax = clearanceAt(fitAt20C, shiftUmPerK, serviceTempC.maxC)
  const inServiceUm = {
    minUm: Math.min(atServiceMin.minUm, atServiceMax.minUm),
    maxUm: Math.max(atServiceMin.maxUm, atServiceMax.maxUm),
  }
  const windowShare = shareInside(inServiceUm, windowUm)
  return { atServiceMin, atServiceMax, inServiceUm, windowShare, windowStatus: windowStatus(windowShare) }
}

/**
 * Share (0 … 1) of the range `actual` that lies inside `window`, by length.
 * The window limits are inclusive, like ISO limits of size: a range that ends
 * exactly on a window limit, from the inside, is fully inside (share 1).
 */
export function shareInside(actual: ClearanceRangeUm, window: ClearanceRangeUm): number {
  const overlapUm = Math.min(actual.maxUm, window.maxUm) - Math.max(actual.minUm, window.minUm)
  const widthUm = actual.maxUm - actual.minUm
  if (widthUm <= 0) return overlapUm >= 0 ? 1 : 0
  return Math.max(0, overlapUm) / widthUm
}

/**
 * Edge rule: pass when the whole range is inside the window (limits
 * inclusive); fail when no part of it of any length is inside, which includes
 * a range that only touches a window limit from the outside (only parts at
 * the very extreme of both tolerances would meet it, so in practice none do);
 * warn otherwise.
 */
export function windowStatus(windowShare: number): CheckStatus {
  if (windowShare === 1) return 'pass'
  return windowShare === 0 ? 'fail' : 'warn'
}
