import { roundUm } from '../calc'
import type { ClearanceAtTemperature, ClearanceRangeUm } from './types'

/**
 * ISO 1:2022: the dimensions in a geometrical product specification (and so
 * the ISO 286 limits) apply at the standard reference temperature of 20 °C.
 */
export const REFERENCE_TEMP_C = 20

const M_PER_MM = 1e-3

/**
 * Growth of a diameter per kelvin, µm/K: ΔD/ΔT = D·α, with D in m and α in µm/(m·K).
 * α is taken as constant (its 20 … 100 °C mean value) over the whole range.
 */
export function diameterGrowthUmPerK(nominalMm: number, alphaUmPerMK: number): number {
  return nominalMm * M_PER_MM * alphaUmPerMK
}

/**
 * Change of diametral clearance per kelvin when hole and shaft are at the same
 * uniform temperature: D·(α_hole − α_shaft). Positive: the fit opens when hot.
 */
export function clearanceShiftUmPerK(nominalMm: number, holeAlphaUmPerMK: number, shaftAlphaUmPerMK: number): number {
  return diameterGrowthUmPerK(nominalMm, holeAlphaUmPerMK - shaftAlphaUmPerMK)
}

/**
 * Clearance limits of a fit at a uniform temperature T, from its limits at 20 °C:
 * C(T) = C(20 °C) + D·(α_hole − α_shaft)·(T − 20 °C).
 * Ignores elastic deformation from fit pressure and temperature gradients
 * between the parts (e.g. during warm-up).
 */
export function clearanceAt(fitAt20C: ClearanceRangeUm, shiftUmPerK: number, tempC: number): ClearanceAtTemperature {
  const shiftUm = shiftUmPerK * (tempC - REFERENCE_TEMP_C)
  return {
    tempC,
    minUm: roundUm(fitAt20C.minUm + shiftUm),
    maxUm: roundUm(fitAt20C.maxUm + shiftUm),
  }
}

/**
 * Temperature to which ONE part must be brought, from the assembly temperature,
 * to change the clearance by `clearanceGainUm` (the other part stays at the
 * assembly temperature): T = T_assembly ± gain / (D·α). Heating opens a hole,
 * cooling shrinks a shaft. Returns null when the part does not expand (α ≤ 0).
 * Same form as the joining-temperature formula for shrink fits in
 * Roloff/Matek Maschinenelemente (interference fits chapter).
 */
export function joiningTempC(
  assemblyTempC: number, clearanceGainUm: number, nominalMm: number, alphaUmPerMK: number, direction: 'heat' | 'cool',
): number | null {
  const growthUmPerK = diameterGrowthUmPerK(nominalMm, alphaUmPerMK)
  if (growthUmPerK <= 0) return null
  const deltaK = clearanceGainUm / growthUmPerK
  return direction === 'heat' ? assemblyTempC + deltaK : assemblyTempC - deltaK
}
