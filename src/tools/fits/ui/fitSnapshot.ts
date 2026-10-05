// What "Save revision" hands to a project: the fit on screen, its verdict
// against the required in-service window, its headline numbers in SI, and the
// complete inputs so the revision reopens exactly as saved, and the materials
// it uses for "Used in" on the Materials page.
import type { SnapshotFigure, ToolSnapshot } from '../../../core/projects/revision'
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
  const nominal = formatQuantity('length', 'si', inputs.nominalMm)
  const clearanceFigures: SnapshotFigure[] = service.bands.map((band) => ({
    label: `C at ${formatQuantity('temperature', 'si', band.tempC, { withUnit: true })}`,
    value: formatQuantityRange('deviation', 'si', band.minUm, band.maxUm, false),
    unit: 'µm',
  }))
  return ok({
    tool: 'fit',
    title: `Ø${formatDecimal(inputs.nominalMm, 3)} ${fit.value.designation}`,
    status: service.status,
    figures: [
      { label: 'Fit', value: fit.value.designation },
      { label: 'Nominal', value: nominal, unit: 'mm' },
      ...clearanceFigures,
    ],
    inputs,
    materialIds: [...new Set([inputs.housingMaterialId, inputs.shaftMaterialId])],
  })
}
