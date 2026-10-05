// A fit in service, as the screens show it: its clearance at the coldest and
// hottest service temperature and at the 20 °C reference, and the advisor's
// verdict on the in-service range against the required window (see
// inServiceClearance), as a project status.
import type { Material } from '../../../../core/materials'
import type { ToolSnapshot } from '../../../../core/projects/revision'
import {
  clearanceAt, clearanceShiftUmPerK, inServiceClearance, REFERENCE_TEMP_C,
  type CheckStatus, type ClearanceAtTemperature, type ClearanceRangeUm,
} from '../../advisor'
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
  const { inServiceUm, windowStatus } = inServiceClearance(at20, shiftUmPerK, inputs.serviceTempC, inputs.requiredClearanceUm)
  return { bands, inServiceUm, status: STATUS_OF_WINDOW[windowStatus] }
}

const STATUS_OF_WINDOW: Record<CheckStatus, FitStatus> = { pass: 'pass', warn: 'review', fail: 'fail' }

function bandKind(tempC: number): BandKind {
  if (tempC < REFERENCE_TEMP_C) return 'cold'
  return tempC > REFERENCE_TEMP_C ? 'hot' : 'reference'
}
