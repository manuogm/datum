import type { LaminaProperties } from '../../../core/materials'
import type { Matrix3, Vector3 } from './types'

/**
 * Stiffness of a single ply in plane stress, and the rotations between ply
 * axes (1 along the fibres) and laminate axes (x, y). Formulas from
 * R. M. Jones, Mechanics of Composite Materials, 2nd ed. (1999), §2.6 and §2.8.
 * Moduli in MPa; shear strains are engineering strains γ = 2ε.
 */

const MPA_PER_GPA = 1000

/** ν21 = ν12 · E2 / E1 (reciprocity of the compliance matrix, Jones eq. 2.67). */
export function minorPoissonRatio(lamina: LaminaProperties): number {
  return (lamina.nu12 * lamina.e2GPa) / lamina.e1GPa
}

/**
 * Reduced stiffness Q in ply axes, MPa (Jones eq. 2.61):
 * Q11 = E1/(1 − ν12ν21), Q22 = E2/(1 − ν12ν21), Q12 = ν12·E2/(1 − ν12ν21), Q66 = G12.
 */
export function reducedStiffnessMPa(lamina: LaminaProperties): Matrix3 {
  const e1 = lamina.e1GPa * MPA_PER_GPA
  const e2 = lamina.e2GPa * MPA_PER_GPA
  const denominator = 1 - lamina.nu12 * minorPoissonRatio(lamina)
  const q11 = e1 / denominator
  const q22 = e2 / denominator
  const q12 = (lamina.nu12 * e2) / denominator
  const q66 = lamina.g12GPa * MPA_PER_GPA
  return [[q11, q12, 0], [q12, q22, 0], [0, 0, q66]]
}

/** cos θ and sin θ of a ply angle in degrees. */
function directionCosines(angleDeg: number): { readonly c: number; readonly s: number } {
  const radians = (angleDeg * Math.PI) / 180
  return { c: Math.cos(radians), s: Math.sin(radians) }
}

/** Transformed reduced stiffness Q̄(θ) in laminate axes, MPa (Jones eq. 2.84). */
export function transformedStiffnessMPa(q: Matrix3, angleDeg: number): Matrix3 {
  const { c, s } = directionCosines(angleDeg)
  const [c2, s2] = [c * c, s * s]
  const [[q11, q12], [, q22], [, , q66]] = q
  const q11b = q11 * c2 * c2 + 2 * (q12 + 2 * q66) * s2 * c2 + q22 * s2 * s2
  const q12b = (q11 + q22 - 4 * q66) * s2 * c2 + q12 * (s2 * s2 + c2 * c2)
  const q22b = q11 * s2 * s2 + 2 * (q12 + 2 * q66) * s2 * c2 + q22 * c2 * c2
  const q16b = (q11 - q12 - 2 * q66) * s * c2 * c + (q12 - q22 + 2 * q66) * s2 * s * c
  const q26b = (q11 - q12 - 2 * q66) * s2 * s * c + (q12 - q22 + 2 * q66) * s * c2 * c
  const q66b = (q11 + q22 - 2 * q12 - 2 * q66) * s2 * c2 + q66 * (s2 * s2 + c2 * c2)
  return [[q11b, q12b, q16b], [q12b, q22b, q26b], [q16b, q26b, q66b]]
}

/**
 * Engineering strains from laminate axes to ply axes (Jones eq. 2.79 with
 * the Reuter matrix): ε1 = c²εx + s²εy + cs·γxy, ε2 = s²εx + c²εy − cs·γxy,
 * γ12 = −2cs·εx + 2cs·εy + (c² − s²)·γxy.
 */
export function strainToMaterialAxes([ex, ey, gxy]: Vector3, angleDeg: number): Vector3 {
  const { c, s } = directionCosines(angleDeg)
  return [
    c * c * ex + s * s * ey + c * s * gxy,
    s * s * ex + c * c * ey - c * s * gxy,
    -2 * c * s * ex + 2 * c * s * ey + (c * c - s * s) * gxy,
  ]
}

/** Matrix × vector. */
export function multiply(m: Matrix3, [x, y, z]: Vector3): Vector3 {
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ]
}
