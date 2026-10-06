import type { LaminaProperties } from '../../../core/materials'
import { plyFailure } from './failure'
import { multiply, strainToMaterialAxes } from './lamina'
import type { FailureCriterion, Matrix3, PointResponse, Vector3 } from './types'

/**
 * Strains and stresses at a height z in one ply (Jones §4.2):
 * ε(z) = ε0 + z·κ in laminate axes, σ = Q̄·ε; in ply axes ε12 = T·ε and
 * σ12 = Q·ε12. Then the ply's reserve factor at that point.
 */

/** Mid-plane strain and curvature under the loads: [ε0; κ] = [A B; B D]⁻¹ · [N; M]. */
export function midplaneResponse(compliance: { readonly a: Matrix3; readonly b: Matrix3; readonly d: Matrix3 }, forces: Vector3, moments: Vector3)
  : { readonly strain: Vector3; readonly curvaturePerMm: Vector3 } {
  const add = (u: Vector3, v: Vector3): Vector3 => [u[0] + v[0], u[1] + v[1], u[2] + v[2]]
  const transpose = (m: Matrix3): Matrix3 => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]]
  // The 6×6 inverse is symmetric, so its lower-left block is bᵀ.
  return {
    strain: add(multiply(compliance.a, forces), multiply(compliance.b, moments)),
    curvaturePerMm: add(multiply(transpose(compliance.b), forces), multiply(compliance.d, moments)),
  }
}

export interface PointContext {
  readonly angleDeg: number
  readonly qMPa: Matrix3
  readonly qBarMPa: Matrix3
  readonly lamina: LaminaProperties
  readonly criterion: FailureCriterion
  readonly f12Star: number
}

export function pointResponse(zMm: number, midplaneStrain: Vector3, curvaturePerMm: Vector3, ply: PointContext): PointResponse {
  const [e0, k] = [midplaneStrain, curvaturePerMm]
  const strainGlobal: Vector3 = [e0[0] + zMm * k[0], e0[1] + zMm * k[1], e0[2] + zMm * k[2]]
  const strainMaterial = strainToMaterialAxes(strainGlobal, ply.angleDeg)
  const stressMaterialMPa = multiply(ply.qMPa, strainMaterial)
  const { reserveFactor, mode } = plyFailure(stressMaterialMPa, ply.lamina, ply.criterion, ply.f12Star)
  return {
    zMm,
    strainGlobal,
    stressGlobalMPa: multiply(ply.qBarMPa, strainGlobal),
    strainMaterial,
    stressMaterialMPa,
    reserveFactor,
    failureIndex: 1 / reserveFactor,
    mode,
  }
}
