// A fit in service: its clearance at the coldest and hottest service
// temperature and at the 20 °C reference, and whether the in-service
// clearance stays inside the required window. Uses the advisor's thermal
// model (clearance changes by D·(α_housing − α_shaft) per kelvin).
import type { Material } from '../../../../core/materials'
import type { ToolSnapshot } from '../../../../core/projects/revision'
import { clearanceAt, clearanceShiftUmPerK, REFERENCE_TEMP_C, type ClearanceAtTemperature, type ClearanceRangeUm } from '../../advisor'
import type { FitAnalysis } from '../../calc'
import type { FitInputs } from '../state/fitInputs'

export type FitStatus = ToolSnapshot['status']

/** Colder than, at, or hotter than the 20 °C reference temperature. */
export type BandKind = 'cold' | 'reference' | 'hot'

export interface TemperatureBand extends ClearanceAtTemperature {
  readonly kind: BandKind
}

export interface ServiceClearance {
  /** Clearance at each distinct temperature of: service minimum, 20 °C, service maximum (coldest first). */
  readonly bands: readonly TemperatureBand[]
  /** Smallest and largest clearance anywhere in the service range. */
  readonly inServiceUm: ClearanceRangeUm
  /** pass: all inside the required window; review: partly; fail: none. */
  readonly status: FitStatus
}

type ServiceInputs = Pick<FitInputs, 'nominalMm' | 'serviceTempC' | 'requiredClearanceUm'>

export function serviceClearance(fit: FitAnalysis, inputs: ServiceInputs, housing: Material, shaft: Material): ServiceClearance {
  const shiftUmPerK = clearanceShiftUmPerK(inputs.nominalMm, housing.thermalExpansionUmPerMK, shaft.thermalExpansionUmPerMK)
  const at20 = { minUm: fit.minClearanceUm, maxUm: fit.maxClearanceUm }
  const { minC, maxC } = inputs.serviceTempC
  const temps = [...new Set([minC, REFERENCE_TEMP_C, maxC])].sort((a, b) => a - b)
  const bands = temps.map((tempC) => ({ ...clearanceAt(at20, shiftUmPerK, tempC), kind: bandKind(tempC) }))
  // Clearance is linear in temperature, so its extremes are at the ends of the range.
  const ends = [clearanceAt(at20, shiftUmPerK, minC), clearanceAt(at20, shiftUmPerK, maxC)]
  const inServiceUm = {
    minUm: Math.min(...ends.map((end) => end.minUm)),
    maxUm: Math.max(...ends.map((end) => end.maxUm)),
  }
  return { bands, inServiceUm, status: windowStatus(inServiceUm, inputs.requiredClearanceUm) }
}

function bandKind(tempC: number): BandKind {
  if (tempC < REFERENCE_TEMP_C) return 'cold'
  return tempC > REFERENCE_TEMP_C ? 'hot' : 'reference'
}

function windowStatus(actual: ClearanceRangeUm, window: ClearanceRangeUm): FitStatus {
  if (actual.minUm >= window.minUm && actual.maxUm <= window.maxUm) return 'pass'
  const overlaps = actual.maxUm >= window.minUm && actual.minUm <= window.maxUm
  return overlaps ? 'review' : 'fail'
}
