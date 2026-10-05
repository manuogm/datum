// Words for a fit's in-service result, shared by the results column and the
// report: "−5.3 … 77.9 µm over −20 … 140 °C; required 0 … 40 µm".
import { formatQuantityRange, type UnitSystem } from '../../../../core/units'
import type { FitCandidate } from '../../advisor'
import type { FitInputs } from '../state/fitInputs'
import type { ServiceClearance } from './serviceClearance'

export function serviceSummary(service: ServiceClearance, inputs: FitInputs, system: UnitSystem): string {
  const { inServiceUm } = service
  const { serviceTempC, requiredClearanceUm } = inputs
  return `${formatQuantityRange('deviation', system, inServiceUm.minUm, inServiceUm.maxUm)} over `
    + `${formatQuantityRange('temperature', system, serviceTempC.minC, serviceTempC.maxC)}; `
    + `required ${formatQuantityRange('deviation', system, requiredClearanceUm.minUm, requiredClearanceUm.maxUm)}`
}

/**
 * Everything the report must warn about: the materials' service limits, and
 * either the advisor's checks that did not pass (when the fit is one of its
 * candidates) or, otherwise, an in-service result outside the window.
 */
export function reportWarnings(
  service: ServiceClearance, inputs: FitInputs, system: UnitSystem,
  candidate: FitCandidate | undefined, materialNotes: readonly string[],
): readonly string[] {
  const fitWarnings = candidate
    ? candidate.checks.filter((check) => check.status !== 'pass').map((check) => check.message)
    : service.status === 'pass' ? [] : [`In service ${serviceSummary(service, inputs, system)}.`]
  return [...fitWarnings, ...materialNotes]
}
