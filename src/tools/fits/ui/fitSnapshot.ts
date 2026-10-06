// What the library lists about a fit calculation: the fit on screen (in the
// title), its verdict (see presentedStatus: the advisor's checks of the best
// match, or the clearance in service against the required window, pass
// without one), the clearance at each service temperature in SI, and the
// complete inputs.
import type { SnapshotFigure, ToolSnapshot } from '../../../core/library'
import { fail, ok, type Result } from '../../../core/result'
import { formatDecimal, formatQuantity, formatQuantityRange } from '../../../core/units'
import { fitResults, presentedFit } from './logic/fitResults'
import { serviceRangeError } from './logic/fitSteps'
import { serviceClearance } from './logic/serviceClearance'
import { presentedStatus } from './logic/verdict'
import type { FitInputs } from './state/fitInputs'

/** Fails, with the engine's explanation, when the inputs give no valid fit or a service range is the wrong way round. */
export function fitSnapshot(inputs: FitInputs): Result<ToolSnapshot<FitInputs>> {
  const results = fitResults(inputs, 'si')
  const fit = presentedFit(inputs, results)
  if (!fit.ok) return fit
  const serviceError = inputs.mode === 'calculator' ? serviceRangeError(inputs) : null
  if (serviceError !== null) return fail(serviceError)
  const service = serviceClearance(fit.value, inputs, results.housing, results.shaft)
  const clearanceFigures: SnapshotFigure[] = service.bands.map((band) => ({
    label: `C at ${formatQuantity('temperature', 'si', band.tempC, { withUnit: true })}`,
    value: formatQuantityRange('deviation', 'si', band.minUm, band.maxUm, false),
    unit: 'µm',
  }))
  return ok({
    tool: 'fit',
    title: `Ø${formatDecimal(inputs.nominalMm, 3)} ${fit.value.designation}`,
    status: presentedStatus(inputs, results, fit.value, service),
    figures: clearanceFigures,
    inputs,
  })
}
