import { fail, ok, type Result } from '../../../core/result'
import { COUPLING_TOLERANCE } from './rules'
import type { Coupling, EngineeringConstants, Matrix3, Stiffness, Vector3 } from './types'

/**
 * Classical laminate theory: the A, B, D stiffness matrices, their inverse
 * and what follows from them. Jones (1999) §4.2; z is measured from the
 * mid-plane, positive towards the top surface (ply 1), so a ply spans
 * z_bottom … z_top with z_top > z_bottom.
 */

const MPA_PER_GPA = 1000

/** A ply as the stiffness sums need it: Q̄ in MPa and its z range in mm. */
export interface PlySection {
  readonly qBarMPa: Matrix3
  readonly zTopMm: number
  readonly zBottomMm: number
}

/** z of the top and bottom face of each ply, top ply first, for a stack of total thickness Σt centred on z = 0. */
export function plyBoundariesMm(thicknessesMm: readonly number[]): readonly { readonly zTopMm: number; readonly zBottomMm: number }[] {
  const halfMm = thicknessesMm.reduce((sum, t) => sum + t, 0) / 2
  let zTopMm = halfMm
  return thicknessesMm.map((t) => {
    const faces = { zTopMm, zBottomMm: zTopMm - t }
    zTopMm -= t
    return faces
  })
}

/** Σ Q̄ · weight(ply), element by element. */
function weightedSum(plies: readonly PlySection[], weight: (ply: PlySection) => number): Matrix3 {
  const element = (i: number, j: number) => plies.reduce((sum, ply) => sum + ply.qBarMPa[i][j] * weight(ply), 0)
  const row = (i: number): Vector3 => [element(i, 0), element(i, 1), element(i, 2)]
  return [row(0), row(1), row(2)]
}

/**
 * A = Σ Q̄·(z_top − z_bottom), B = ½ Σ Q̄·(z_top² − z_bottom²),
 * D = ⅓ Σ Q̄·(z_top³ − z_bottom³)  (Jones eq. 4.28).
 */
export function laminateMatrices(plies: readonly PlySection[]): { readonly a: Matrix3; readonly b: Matrix3; readonly d: Matrix3 } {
  return {
    a: weightedSum(plies, ({ zTopMm, zBottomMm }) => zTopMm - zBottomMm),
    b: weightedSum(plies, ({ zTopMm, zBottomMm }) => (zTopMm ** 2 - zBottomMm ** 2) / 2),
    d: weightedSum(plies, ({ zTopMm, zBottomMm }) => (zTopMm ** 3 - zBottomMm ** 3) / 3),
  }
}

/** Inverse of a square matrix by Gauss-Jordan elimination with partial pivoting; an error if it is singular. */
export function invert(matrix: readonly (readonly number[])[]): Result<number[][]> {
  const n = matrix.length
  const rows = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  const scale = Math.max(...matrix.flat().map(Math.abs))
  for (let column = 0; column < n; column++) {
    let pivot = column
    for (let r = column + 1; r < n; r++) if (Math.abs(rows[r][column]) > Math.abs(rows[pivot][column])) pivot = r
    if (!(Math.abs(rows[pivot][column]) > scale * 1e-14)) return fail('The laminate stiffness matrix is singular: check the ply properties and thicknesses.')
    ;[rows[column], rows[pivot]] = [rows[pivot], rows[column]]
    const lead = rows[column][column]
    rows[column] = rows[column].map((value) => value / lead)
    for (let r = 0; r < n; r++) {
      if (r === column) continue
      const factor = rows[r][column]
      rows[r] = rows[r].map((value, j) => value - factor * rows[column][j])
    }
  }
  return ok(rows.map((row) => row.slice(n)))
}

/** The 3×3 block of a 6×6 matrix starting at (row, column). */
function block(m: readonly (readonly number[])[], row: number, column: number): Matrix3 {
  const r = (i: number): Vector3 => [m[row + i][column], m[row + i][column + 1], m[row + i][column + 2]]
  return [r(0), r(1), r(2)]
}

/** A, B, D and the inverse of the 6×6 matrix [A B; B D]. */
export function laminateStiffness(plies: readonly PlySection[]): Result<Stiffness> {
  const { a, b, d } = laminateMatrices(plies)
  const abd = [0, 1, 2].map((i) => [...a[i], ...b[i]]).concat([0, 1, 2].map((i) => [...b[i], ...d[i]]))
  const inverse = invert(abd)
  if (!inverse.ok) return inverse
  return ok({
    aNPerMm: a, bN: b, dNmm: d,
    compliance: { a: block(inverse.value, 0, 0), b: block(inverse.value, 0, 3), d: block(inverse.value, 3, 3) },
  })
}

const largest = (values: readonly number[]) => Math.max(...values.map(Math.abs))

/** Coupling flags, with terms below COUPLING_TOLERANCE of the matching main terms counted as zero. */
export function couplingOf(stiffness: Stiffness, thicknessMm: number): Coupling {
  const { aNPerMm: a, bN: b, dNmm: d } = stiffness
  const aScale = largest(a.flat())
  const dScale = largest(d.flat())
  return {
    bendingExtension: largest(b.flat()) > COUPLING_TOLERANCE * aScale * thicknessMm,
    shearExtension: largest([a[0][2], a[1][2]]) > COUPLING_TOLERANCE * aScale,
    bendTwist: largest([d[0][2], d[1][2]]) > COUPLING_TOLERANCE * dScale,
  }
}

/**
 * Laminate engineering constants from the ABD inverse (Daniel & Ishai,
 * Engineering Mechanics of Composite Materials, 2nd ed. (2006), §8.7):
 * Ex = 1/(h·a11), Ey = 1/(h·a22), Gxy = 1/(h·a66), νxy = −a12/a11,
 * νyx = −a12/a22, and flexural Efx = 12/(h³·d11), Efy = 12/(h³·d22).
 * With B = 0 the a block equals A⁻¹; otherwise these are apparent values.
 */
export function engineeringConstants(stiffness: Stiffness, thicknessMm: number, bendingExtension: boolean): EngineeringConstants {
  const { a, d } = stiffness.compliance
  const h = thicknessMm
  return {
    exGPa: 1 / (h * a[0][0]) / MPA_PER_GPA,
    eyGPa: 1 / (h * a[1][1]) / MPA_PER_GPA,
    gxyGPa: 1 / (h * a[2][2]) / MPA_PER_GPA,
    nuXy: -a[0][1] / a[0][0],
    nuYx: -a[0][1] / a[1][1],
    flexuralExGPa: 12 / (h ** 3 * d[0][0]) / MPA_PER_GPA,
    flexuralEyGPa: 12 / (h ** 3 * d[1][1]) / MPA_PER_GPA,
    apparent: bendingExtension,
  }
}
