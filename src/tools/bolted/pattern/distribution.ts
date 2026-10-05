import { fail, ok, type Result } from '../../../core/result'
import type { BoltLoad, CentroidLoad, PatternLoadCase, PatternProperties } from './types'

/**
 * Load sharing in a bolt pattern under a rigid plate (the classical
 * "bolt group" method, e.g. Shigley's Mechanical Engineering Design, shear
 * and tension in bolt groups; VDI 2230-1 itself starts from the single bolt).
 *
 * Assumptions, documented simplifications:
 * - the clamped plate is rigid and every bolt is equally stiff, axially and
 *   in shear, whatever its joint type;
 * - axial loads vary linearly over the pattern, with the neutral axis through
 *   the pattern centroid (no prying, no shift of the neutral axis towards the
 *   compressed edge, which a bolted flange shows once the plate lifts);
 * - in-plane loads: direct shear F/n plus torsion Mz·r/Σr² about the centroid
 *   (elastic method, not the instantaneous-centre method).
 */

const N_MM_PER_N_M = 1000

interface Point {
  readonly xMm: number
  readonly yMm: number
}

/** Centroid and second moments of the bolt positions about it. */
export function patternProperties(points: readonly Point[]): PatternProperties {
  const n = points.length
  const centroidMm = {
    x: points.reduce((sum, p) => sum + p.xMm, 0) / n,
    y: points.reduce((sum, p) => sum + p.yMm, 0) / n,
  }
  const local = points.map((p) => ({ x: p.xMm - centroidMm.x, y: p.yMm - centroidMm.y }))
  const ixxMm2 = local.reduce((sum, p) => sum + p.y ** 2, 0)
  const iyyMm2 = local.reduce((sum, p) => sum + p.x ** 2, 0)
  return { centroidMm, ixxMm2, iyyMm2, ixyMm2: local.reduce((sum, p) => sum + p.x * p.y, 0), polarMm2: ixxMm2 + iyyMm2 }
}

/**
 * The load case moved from its load point to the centroid:
 *   M_centroid = M + r × F, with r from the centroid to the load point.
 */
export function loadAtCentroid(loadCase: PatternLoadCase, centroidMm: PatternProperties['centroidMm']): CentroidLoad {
  const { forceN: f, momentNm: m } = loadCase
  const point = loadCase.loadPointMm ?? { x: centroidMm.x, y: centroidMm.y, z: 0 }
  const r = { x: (point.x - centroidMm.x) / N_MM_PER_N_M, y: (point.y - centroidMm.y) / N_MM_PER_N_M, z: point.z / N_MM_PER_N_M }
  return {
    forceN: f,
    momentNm: {
      x: m.x + r.y * f.z - r.z * f.y,
      y: m.y + r.z * f.x - r.x * f.z,
      z: m.z + r.x * f.y - r.y * f.x,
    },
  }
}

/**
 * Gradient g = (gx, gy) of the axial bolt force, FA = Fz/n + gx·x + gy·y,
 * from moment equilibrium of the bolt forces about the centroid:
 *   Σ FA·y = Mx  and  −Σ FA·x = My   ⇔   [Σx² Σxy; Σxy Σy²]·g = (−My, Mx)
 * Solved on the principal axes of the pattern, so that a pattern with all
 * bolts in a line still carries a moment about the perpendicular axis; a
 * moment about the line itself cannot be carried (the plate would hinge).
 */
function axialGradient(properties: PatternProperties, momentNmm: { x: number; y: number }): Result<{ x: number; y: number }> {
  const { iyyMm2: a, ixyMm2: b, ixxMm2: d } = properties
  const h = { x: -momentNmm.y, y: momentNmm.x }
  const mean = (a + d) / 2
  const radius = Math.hypot((a - d) / 2, b)
  // Principal directions of the symmetric matrix [a b; b d].
  const angle = 0.5 * Math.atan2(2 * b, a - d)
  const axes = [
    { lambda: mean + radius, v: { x: Math.cos(angle), y: Math.sin(angle) } },
    { lambda: mean - radius, v: { x: -Math.sin(angle), y: Math.cos(angle) } },
  ]
  const tolerance = 1e-9 * Math.max(a + d, 1)
  const momentSize = Math.hypot(h.x, h.y)
  const g = { x: 0, y: 0 }
  for (const { lambda, v } of axes) {
    const component = v.x * h.x + v.y * h.y
    if (lambda <= tolerance) {
      if (Math.abs(component) > 1e-9 * momentSize) {
        return fail('The bolts lie in one line (or on one point), so they cannot carry a moment about that line: the plate would tip.')
      }
      continue
    }
    g.x += (component / lambda) * v.x
    g.y += (component / lambda) * v.y
  }
  return ok(g)
}

/**
 * Force on each bolt from the load at the centroid:
 * - axial: FA = Fz/n + gx·x + gy·y (see axialGradient);
 * - shear: Q = (Fx, Fy)/n + Mz × r / Σr² = (Fx/n − Mz·y/J, Fy/n + Mz·x/J).
 */
export function boltLoads(points: readonly Point[], properties: PatternProperties, load: CentroidLoad): Result<readonly BoltLoad[]> {
  const n = points.length
  const m = { x: load.momentNm.x * N_MM_PER_N_M, y: load.momentNm.y * N_MM_PER_N_M, z: load.momentNm.z * N_MM_PER_N_M }
  if (m.z !== 0 && properties.polarMm2 <= 0) return fail('A single bolt position cannot carry a torque Mz about the pattern centroid.')
  const gradient = axialGradient(properties, m)
  if (!gradient.ok) return gradient
  const torsionPerMm2 = properties.polarMm2 > 0 ? m.z / properties.polarMm2 : 0
  return ok(points.map((p) => {
    const x = p.xMm - properties.centroidMm.x
    const y = p.yMm - properties.centroidMm.y
    const shearXN = load.forceN.x / n - torsionPerMm2 * y
    const shearYN = load.forceN.y / n + torsionPerMm2 * x
    return {
      xMm: x,
      yMm: y,
      axialN: load.forceN.z / n + gradient.value.x * x + gradient.value.y * y,
      shearXN,
      shearYN,
      shearN: Math.hypot(shearXN, shearYN),
    }
  }))
}
