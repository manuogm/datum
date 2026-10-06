import type { ReserveStatus } from './types'

/**
 * The judgement calls of the laminate engine in one place, so they can be
 * checked and tuned. "UNSURE" marks values that are a choice rather than a
 * requirement of the cited source.
 */

/**
 * Normalised Tsai-Wu interaction coefficient F12* = F12 / √(F11·F22).
 * −0.5 is the value Tsai & Hahn (1980) recommend in the absence of biaxial
 * tests; it makes the failure surface a generalised von Mises ellipse. Any
 * value with |F12*| < 1 keeps the surface closed.
 */
export const DEFAULT_TSAI_WU_F12_STAR = -0.5

/**
 * Default target reserve factor: the composite minimum reserve factor of the
 * project design targets (DesignTargets.minReserveFactorComposite, 1.5).
 */
export const DEFAULT_TARGET_RESERVE_FACTOR = 1.5

/**
 * Relative size below which a coupling term counts as zero (B against
 * max|A|·h, A16/A26 against max|A|, D16/D26 against max|D|). Round-off in
 * the sums is about 1e-16 of the terms; 1e-9 is far above it.
 */
export const COUPLING_TOLERANCE = 1e-9

/** Plies whose reserve factors are within 0.1 % of the lowest are all reported as critical. */
export const CRITICAL_PLY_TOLERANCE = 1e-3

/** Largest laminate the engine accepts (and the layup parser expands to): a guard against typing "[0]999s". */
export const MAX_PLIES = 400

/** pass RF ≥ target, warn 1 ≤ RF < target (fails the target, not the ply), fail RF < 1. */
export function reserveStatus(reserveFactor: number, targetReserveFactor: number): ReserveStatus {
  if (reserveFactor >= targetReserveFactor) return 'pass'
  return reserveFactor >= 1 ? 'warn' : 'fail'
}
