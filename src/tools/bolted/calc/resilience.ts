import type { ThreadGeometry } from './threads'
import type { HeadType, ResilienceSegment } from './types'

/**
 * Elastic resilience δ = 1/c (mm/N) of the bolt and of the clamped parts,
 * VDI 2230-1:2015 §5.1 (calculation step R3).
 */

/** δ = l / (E·A) of a prismatic section. */
function prismResilienceMmPerN(lengthMm: number, modulusMPa: number, areaMm2: number): number {
  return lengthMm / (modulusMPa * areaMm2)
}

export interface BoltSectionInput {
  readonly thread: ThreadGeometry
  readonly headType: HeadType
  readonly boltModulusMPa: number
  readonly clampLengthMm: number
  readonly shankLengthMm: number
  /**
   * Nut (through-bolt) or tapped part. VDI 2230-1 §5.1.1: lM = 0.4·d for a
   * nut, lM = 0.33·d for a tapped thread, with the modulus of the nut / tapped part.
   */
  readonly engaged: { readonly kind: 'nut' | 'tapped'; readonly modulusMPa: number }
}

/**
 * δS (R3, VDI 2230-1 §5.1.1.1): the bolt as springs in series,
 *   δS = δSK + δshank + δGew + δG + δM
 * - head: lSK = 0.5·d (hexagon head) or 0.4·d (socket head), on AN;
 * - unthreaded shank inside the clamp length: ls on AN;
 * - free loaded thread: lGew = lK − ls on Ad3;
 * - engaged thread: lG = 0.5·d on Ad3;
 * - nut or tapped-thread displacement: lM on AN with the nut / tapped-part modulus.
 */
export function boltSegments(input: BoltSectionInput): readonly ResilienceSegment[] {
  const { thread, boltModulusMPa: es } = input
  const d = thread.nominalMm
  const section = (name: string, lengthMm: number, areaMm2: number, modulusMPa: number): ResilienceSegment =>
    ({ name, lengthMm, areaMm2, modulusMPa, resilienceMmPerN: prismResilienceMmPerN(lengthMm, modulusMPa, areaMm2) })
  const freeThreadMm = input.clampLengthMm - input.shankLengthMm
  return [
    section('Head', (input.headType === 'hex' ? 0.5 : 0.4) * d, thread.nominalAreaMm2, es),
    input.shankLengthMm > 0 ? section('Shank', input.shankLengthMm, thread.nominalAreaMm2, es) : null,
    freeThreadMm > 0 ? section('Free loaded thread', freeThreadMm, thread.minorAreaMm2, es) : null,
    section('Engaged thread', 0.5 * d, thread.minorAreaMm2, es),
    input.engaged.kind === 'nut'
      ? section('Nut', 0.4 * d, thread.nominalAreaMm2, input.engaged.modulusMPa)
      : section('Tapped thread', 0.33 * d, thread.nominalAreaMm2, input.engaged.modulusMPa),
  ].filter((s) => s !== null)
}

// ── Clamped parts: substitute deformation cone (VDI 2230-1 §5.1.2.2) ──────────

export interface ConeInput {
  /** From the head side; thickness and Young's modulus of each layer. */
  readonly layers: readonly { readonly thicknessMm: number; readonly modulusMPa: number }[]
  /** dW: outer bearing diameter where the cone starts (head and nut). */
  readonly bearingMm: number
  /** dh: hole in the clamped parts. */
  readonly holeMm: number
  /** DA: outer diameter of the clamped parts. */
  readonly outerMm: number
  /** Through-bolt (two cones, "DSV", w = 1) or tapped thread (one cone, "ESV", w = 2). */
  readonly kind: 'through' | 'tapped'
}

export interface ConeResilience {
  readonly tanPhi: number
  /** DA,Gr = dW + w·lK·tan φ. */
  readonly limitDiameterMm: number
  readonly totalMmPerN: number
  /** δP of each layer, same order as the input. */
  readonly perLayerMmPerN: readonly number[]
}

/**
 * tan φ of the substitute deformation cone (VDI 2230-1 §5.1.2.2), with
 * βL = lK/dW and y = DA/dW:
 *   through-bolt (DSV): tan φD = 0.362 + 0.032·ln(βL/2) + 0.153·ln y
 *   tapped (ESV):       tan φE = 0.348 + 0.013·ln βL + 0.193·ln y
 */
export function coneTanPhi(kind: ConeInput['kind'], clampLengthMm: number, bearingMm: number, outerMm: number): number {
  const betaL = clampLengthMm / bearingMm
  const y = outerMm / bearingMm
  return kind === 'through'
    ? 0.362 + 0.032 * Math.log(betaL / 2) + 0.153 * Math.log(y)
    : 0.348 + 0.013 * Math.log(betaL) + 0.193 * Math.log(y)
}

/**
 * δP of the clamped parts. The deformation body is a cone of half-angle φ
 * starting at dW under the head (and under the nut for a through-bolt, the
 * two cones meeting at lK/2). Where the cone reaches DA it continues as a
 * sleeve of outer diameter DA. Integrating dz / (E·π/4·(D(z)² − dh²)) along
 * the axis gives, for a cone stretch from D1 to D2 (D = dW + 2·z·tan φ):
 *   δ = ln[(D2 − dh)(D1 + dh) / ((D2 + dh)(D1 − dh))] / (E·π·dh·tan φ)
 * and for a sleeve of length l: δ = 4·l / (E·π·(DA² − dh²)).
 * Over a single material this reproduces the closed forms of §5.1.2.2
 * (cone only when DA ≥ DA,Gr, cone and sleeve when dW < DA < DA,Gr, sleeve
 * when DA ≤ dW). With several materials each layer contributes its own part
 * of the body with its own modulus (§5.1.2.2, clamped parts of different
 * materials), tan φ being taken for the whole clamp length.
 */
export function coneResilience(input: ConeInput): ConeResilience {
  const { layers, bearingMm: dW, holeMm: dh, outerMm: dA, kind } = input
  const clampLengthMm = layers.reduce((sum, layer) => sum + layer.thicknessMm, 0)
  const tanPhi = coneTanPhi(kind, clampLengthMm, dW, dA)
  const w = kind === 'through' ? 1 : 2
  // Distance from the small end of the cone at which it reaches DA (0 when DA ≤ dW: sleeve only).
  const sleeveFromMm = Math.max(0, (dA - dW) / (2 * tanPhi))
  const coneDiameterMm = (distanceMm: number) => dW + 2 * distanceMm * tanPhi
  const logTerm = (diameterMm: number) => Math.log((diameterMm - dh) / (diameterMm + dh))

  /** δ of the body between distances a < b from the small end of a cone, at modulus E. */
  const stretch = (aMm: number, bMm: number, modulusMPa: number): number => {
    const coneEndMm = Math.min(bMm, sleeveFromMm)
    const cone = coneEndMm > aMm
      ? (logTerm(coneDiameterMm(coneEndMm)) - logTerm(coneDiameterMm(aMm))) / (modulusMPa * Math.PI * dh * tanPhi)
      : 0
    const sleeveMm = bMm - Math.max(aMm, sleeveFromMm)
    const sleeve = sleeveMm > 0 ? (4 * sleeveMm) / (modulusMPa * Math.PI * (dA ** 2 - dh ** 2)) : 0
    return cone + sleeve
  }

  // Through-bolt: two cones from head and nut meeting at lK/2. Tapped: one cone over lK.
  const apexMm = kind === 'through' ? clampLengthMm / 2 : clampLengthMm
  const perLayerMmPerN = layers.map(({ thicknessMm, modulusMPa }, index) => {
    const topMm = layers.slice(0, index).reduce((sum, layer) => sum + layer.thicknessMm, 0)
    const bottomMm = topMm + thicknessMm
    const headSide = stretch(Math.min(topMm, apexMm), Math.min(bottomMm, apexMm), modulusMPa)
    const nutSide = kind === 'through'
      ? stretch(clampLengthMm - Math.max(bottomMm, apexMm), clampLengthMm - Math.max(topMm, apexMm), modulusMPa)
      : 0
    return headSide + nutSide
  })
  return {
    tanPhi,
    limitDiameterMm: dW + w * clampLengthMm * tanPhi,
    totalMmPerN: perLayerMmPerN.reduce((sum, value) => sum + value, 0),
    perLayerMmPerN,
  }
}

/**
 * Φn = n · δP / (δS + δP) (R3, VDI 2230-1 §5.2.2, concentric clamping and
 * loading): the share of the axial load FA that adds to the bolt force.
 */
export function loadFactor(introductionFactor: number, boltMmPerN: number, platesMmPerN: number): number {
  return introductionFactor * platesMmPerN / (boltMmPerN + platesMmPerN)
}
