// Runs the engines on the current inputs: the ISO 286 analysis of the
// calculator's fit, the advisor's ranking, and which fit the screen is
// "about" (the one the report and a saved revision describe).
import { MATERIALS, materialById, type Material } from '../../../../core/materials'
import { fail, ok, type Result } from '../../../../core/result'
import type { UnitSystem } from '../../../../core/units'
import { adviseFit, type FitAdvice, type FitCandidate } from '../../advisor'
import { analyseFit, type FitAnalysis } from '../../calc'
import type { FitInputs } from '../state/fitInputs'

export interface FitResults {
  readonly housing: Material
  readonly shaft: Material
  /** The calculator's hole and shaft classes at the nominal size. */
  readonly calculation: Result<FitAnalysis>
  /** The advisor's ranked candidates, best first. */
  readonly advice: Result<FitAdvice>
}

/** `system` is the unit system of the advisor's texts. */
export function fitResults(inputs: FitInputs, system: UnitSystem): FitResults {
  const housing = materialOrFirst(inputs.housingMaterialId)
  const shaft = materialOrFirst(inputs.shaftMaterialId)
  return {
    housing,
    shaft,
    calculation: analyseFit(inputs.hole, inputs.shaft, inputs.nominalMm),
    advice: adviseFit({
      nominalMm: inputs.nominalMm,
      housing,
      shaft,
      functions: inputs.functions,
      assembly: inputs.assembly,
      serviceTempC: inputs.serviceTempC,
      requiredClearanceUm: inputs.requiredClearanceUm,
      maxAssemblyInterferenceUm: inputs.maxAssemblyInterferenceUm,
      unitSystem: system,
    }),
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

/** Ids in the URL are checked when read, so the fallback only guards against a renamed material. */
function materialOrFirst(id: string): Material {
  const material = materialById(id)
  return material.ok ? material.value : MATERIALS[0]
}
