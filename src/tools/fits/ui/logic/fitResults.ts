// Runs the engines on the current inputs: the ISO 286 analysis of the
// calculator's fit, the advisor's ranking, and which fit the screen is
// "about" (the one the report and the library summary describe).
import { MATERIALS, materialById, type Material } from '../../../../core/materials'
import { fail, ok, type Result } from '../../../../core/result'
import type { UnitSystem } from '../../../../core/units'
import { adviseFit, type FitAdvice, type FitCandidate } from '../../advisor'
import { analyseFit, type FitAnalysis } from '../../calc'
import type { FitInputs } from '../state/fitInputs'
import { materialNotes } from './materialNotes'

export interface FitResults {
  readonly housing: Material
  readonly shaft: Material
  /** The calculator's hole and shaft classes at the nominal size. */
  readonly calculation: Result<FitAnalysis>
  /** The advisor's ranked candidates, best first; fails without a required window. */
  readonly advice: Result<FitAdvice>
  /** The housing or shaft used above its service limit (see materialNotes). */
  readonly materialNotes: readonly string[]
}

/** Why the advisor gives no advice without a required window. */
export const NO_WINDOW_ERROR = 'Enter the clearance the fit needs in service: the advisor ranks every ISO fit against it.'

/** `system` is the unit system of the advisor's texts. */
export function fitResults(inputs: FitInputs, system: UnitSystem): FitResults {
  const housing = materialOrFirst(inputs.housingMaterialId)
  const shaft = materialOrFirst(inputs.shaftMaterialId)
  const window = inputs.requiredClearanceUm
  return {
    housing,
    shaft,
    calculation: analyseFit(inputs.hole, inputs.shaft, inputs.nominalMm),
    advice: window === null ? fail(NO_WINDOW_ERROR) : adviseFit({
      nominalMm: inputs.nominalMm,
      housing,
      shaft,
      functions: inputs.functions,
      assembly: inputs.assembly,
      serviceTempC: inputs.serviceTempC,
      requiredClearanceUm: window,
      maxAssemblyInterferenceUm: inputs.maxAssemblyInterferenceUm,
      unitSystem: system,
    }),
    materialNotes: materialNotes(housing, shaft, inputs.serviceTempC, system),
  }
}

/**
 * The fit the screen currently presents: the advisor's best match in advisor
 * mode, the calculator's fit in calculator mode.
 */
export function presentedFit(inputs: FitInputs, results: FitResults): Result<FitAnalysis> {
  if (inputs.mode === 'calculator') return results.calculation
  if (!results.advice.ok) return results.advice
  const best = results.advice.value.candidates[0]
  return best ? ok(best.fit) : fail('The advisor found no candidate fit.')
}

/** The advisor's assessment of a fit, when the fit is one of its candidates. */
export function candidateFor(results: FitResults, designation: string): FitCandidate | undefined {
  return results.advice.ok ? results.advice.value.candidates.find((c) => c.fit.designation === designation) : undefined
}

/** Stored ids are checked when read, so the fallback only guards against a renamed material. */
function materialOrFirst(id: string): Material {
  const material = materialById(id)
  return material.ok ? material.value : MATERIALS[0]
}
