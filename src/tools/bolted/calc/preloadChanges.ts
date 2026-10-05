import { EMBEDDING_UM } from './rules'
import type { SurfaceRoughness } from './types'

/** Preload changes in service (VDI 2230-1:2015 §5.4.2, calculation step R4). */

const MM_PER_UM = 1e-3
const PER_K_PER_UM_PER_MK = 1e-6

/** How many surfaces of each kind can embed. */
export interface EmbeddingSurfaces {
  /** Thread pairs: 1, or 2 with a thread insert (bolt in insert, insert in parent). */
  readonly threads: number
  /** Head and nut bearing faces: 2 for a through-bolt, 1 for a tapped joint. */
  readonly bearings: number
  /** Inner interfaces between clamped parts (washers count as parts). */
  readonly interfaces: number
}

/** fZ: total plastic embedding (VDI 2230-1 Table 5), µm. */
export function embeddingUm(roughness: SurfaceRoughness, direction: 'axial' | 'transverse', surfaces: EmbeddingSurfaces): number {
  const perSurface = EMBEDDING_UM[roughness][direction]
  return surfaces.threads * perSurface.thread + surfaces.bearings * perSurface.bearing + surfaces.interfaces * perSurface.interface
}

/** FZ = fZ / (δS + δP): preload lost to embedding (R4). */
export function embeddingLossN(embeddingUmTotal: number, boltMmPerN: number, platesMmPerN: number): number {
  return (embeddingUmTotal * MM_PER_UM) / (boltMmPerN + platesMmPerN)
}

/**
 * ΔFVth: change of preload when bolt and clamped parts are at a uniform
 * temperature T instead of the assembly temperature (R4, VDI 2230-1 §5.4.2.3):
 *   ΔFVth = (αS·lK − Σ αPi·lPi) · ΔT / (δS + δP)
 * Positive is a preload LOSS (the bolt grows more than the parts), negative a
 * gain. Neglects the change of Young's modulus with temperature, which
 * VDI 2230 includes for large temperature differences.
 */
export function thermalPreloadLossN(
  boltExpansionUmPerMK: number,
  layers: readonly { readonly thicknessMm: number; readonly expansionUmPerMK: number }[],
  deltaTK: number,
  boltMmPerN: number,
  platesMmPerN: number,
): number {
  const clampLengthMm = layers.reduce((sum, layer) => sum + layer.thicknessMm, 0)
  const partsGrowthPerK = layers.reduce((sum, layer) => sum + layer.thicknessMm * layer.expansionUmPerMK, 0)
  const mismatchMm = (boltExpansionUmPerMK * clampLengthMm - partsGrowthPerK) * PER_K_PER_UM_PER_MK * deltaTK
  return mismatchMm / (boltMmPerN + platesMmPerN)
}
