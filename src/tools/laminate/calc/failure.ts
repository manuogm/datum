import type { LaminaProperties } from '../../../core/materials'
import type { FailureCriterion, FailureMode, Vector3 } from './types'

/**
 * Ply failure criteria in ply axes, as a reserve factor RF: the factor on the
 * stresses (σ1, σ2, τ12) at which the criterion reaches failure. Stresses scale
 * with the loads in linear CLT, so RF is also the factor on the laminate loads.
 * Strengths are positive magnitudes: Xt, Xc along the fibres, Yt, Yc across
 * them, S in-plane shear. No stress gives RF = Infinity.
 */

export interface PlyFailure {
  readonly reserveFactor: number
  readonly mode: FailureMode
}

/** The strength that limits each stress component for its sign. */
function limitingStrengthsMPa([s1, s2]: Vector3, lamina: LaminaProperties): { readonly x: number; readonly y: number } {
  return { x: s1 >= 0 ? lamina.xtMPa : lamina.xcMPa, y: s2 >= 0 ? lamina.ytMPa : lamina.ycMPa }
}

/** Reserve factor from a failure index that grows with the square of the load: RF = 1/√FI. */
const fromQuadraticIndex = (index: number) => (index > 0 ? 1 / Math.sqrt(index) : Infinity)

/**
 * Maximum stress criterion (Jones §2.9.2): each stress component against its
 * own strength, no interaction. RF = min(X/|σ1|, Y/|σ2|, S/|τ12|); the
 * minimum names the failure mode.
 */
export function maxStress(stressMPa: Vector3, lamina: LaminaProperties): PlyFailure {
  const [s1, s2, t12] = stressMPa
  const { x, y } = limitingStrengthsMPa(stressMPa, lamina)
  const ratios: readonly [number, FailureMode][] = [
    [Math.abs(s1) / x, s1 >= 0 ? 'fibre-tension' : 'fibre-compression'],
    [Math.abs(s2) / y, s2 >= 0 ? 'matrix-tension' : 'matrix-compression'],
    [Math.abs(t12) / lamina.sMPa, 'shear'],
  ]
  const [ratio, mode] = ratios.reduce((worst, next) => (next[0] > worst[0] ? next : worst))
  return ratio > 0 ? { reserveFactor: 1 / ratio, mode } : { reserveFactor: Infinity, mode: 'none' }
}

/**
 * Tsai-Hill criterion in the Azzi-Tsai form with strengths chosen by stress
 * sign (Jones §2.9.3, Daniel & Ishai §6.6):
 * FI = (σ1/X)² − σ1σ2/X² + (σ2/Y)² + (τ12/S)², RF = 1/√FI.
 */
export function tsaiHill(stressMPa: Vector3, lamina: LaminaProperties): number {
  const [s1, s2, t12] = stressMPa
  const { x, y } = limitingStrengthsMPa(stressMPa, lamina)
  return fromQuadraticIndex((s1 / x) ** 2 - (s1 * s2) / x ** 2 + (s2 / y) ** 2 + (t12 / lamina.sMPa) ** 2)
}

/**
 * Tsai-Wu criterion (Tsai & Wu 1971; Jones §2.9.4):
 *   F1σ1 + F2σ2 + F11σ1² + F22σ2² + F66τ12² + 2F12σ1σ2 = 1 at failure, with
 *   F1 = 1/Xt − 1/Xc, F2 = 1/Yt − 1/Yc, F11 = 1/(Xt·Xc), F22 = 1/(Yt·Yc),
 *   F66 = 1/S², F12 = F12*·√(F11·F22).
 * With the stresses scaled by R: a·R² + b·R = 1 (a the quadratic terms, b the
 * linear ones), whose positive root is R = 2/(b + √(b² + 4a)) (Tsai & Hahn
 * 1980, strength ratio). This form stays finite when a → 0.
 */
export function tsaiWu(stressMPa: Vector3, lamina: LaminaProperties, f12Star: number): number {
  const [s1, s2, t12] = stressMPa
  const { xtMPa: xt, xcMPa: xc, ytMPa: yt, ycMPa: yc, sMPa: s } = lamina
  const f11 = 1 / (xt * xc)
  const f22 = 1 / (yt * yc)
  const f12 = f12Star * Math.sqrt(f11 * f22)
  const linear = (1 / xt - 1 / xc) * s1 + (1 / yt - 1 / yc) * s2
  const quadratic = f11 * s1 ** 2 + f22 * s2 ** 2 + t12 ** 2 / s ** 2 + 2 * f12 * s1 * s2
  const denominator = linear + Math.sqrt(linear ** 2 + 4 * quadratic)
  return denominator > 0 ? 2 / denominator : Infinity
}

/** Reserve factor and dominant mode at a point by the chosen criterion; the mode is always the largest max-stress ratio. */
export function plyFailure(stressMPa: Vector3, lamina: LaminaProperties, criterion: FailureCriterion, f12Star: number): PlyFailure {
  const byMaxStress = maxStress(stressMPa, lamina)
  switch (criterion) {
    case 'max-stress': return byMaxStress
    case 'tsai-hill': return { reserveFactor: tsaiHill(stressMPa, lamina), mode: byMaxStress.mode }
    case 'tsai-wu': return { reserveFactor: tsaiWu(stressMPa, lamina, f12Star), mode: byMaxStress.mode }
  }
}
