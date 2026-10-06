// What the library lists about a fit calculation: the fit on screen (in the
// title), its verdict against the required in-service window, the clearance
// at each service temperature in SI, and the complete inputs.
import type { SnapshotFigure, ToolSnapshot } from '../../../core/library'
import { ok, type Result } from '../../../core/result'
import { formatDecimal, formatQuantity, formatQuantityRange } from '../../../core/units'
import { fitResults, presentedFit } from './logic/fitResults'
import { serviceClearance } from './logic/serviceClearance'
import type { FitInputs } from './state/fitInputs'

/** Fails, with the engine's explanation, when the inputs give no valid fit. */
export function fitSnapshot(inputs: FitInputs): Result<ToolSnapshot<FitInputs>> {
  const results = fitResults(inputs, 'si')
  const fit = presentedFit(inputs, results)
  if (!fit.ok) return fit
  const service = serviceClearance(fit.value, inputs, results.housing, results.shaft)
  const clearanceFigures: SnapshotFigure[] = service.bands.map((band) => ({
    label: `C at ${formatQuantity('temperature', 'si', band.tempC, { withUnit: true })}`,
    value: formatQuantityRange('deviation', 'si', band.minUm, band.maxUm, false),
    unit: 'µm',
  }))
  return ok({
    tool: 'fit',
    title: `Ø${formatDecimal(inputs.nominalMm, 3)} ${fit.value.designation}`,
    status: service.status,
    figures: clearanceFigures,
    inputs,
  })
}
