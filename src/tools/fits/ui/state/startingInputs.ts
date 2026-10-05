// Where the Fit Tolerance screen starts: a reopened revision, else a shared
// link, else a fresh calculation that takes its service temperatures from the
// active project's design targets.
import type { TemperatureRangeC } from '../../advisor'
import { DEFAULT_FIT_INPUTS, type FitInputs } from './fitInputs'
import { fitInputsFrom } from './readInputs'
import { decodeFitInputs } from './urlState'

export interface StartingPoint {
  /** The inputs of a revision being reopened, as stored. */
  saved?: unknown
  /** The query part of the URL hash, without '?'. */
  query: string
  /** The active project's service temperature range. */
  projectServiceTempC?: TemperatureRangeC
}

export function startingInputs({ saved, query, projectServiceTempC }: StartingPoint): FitInputs {
  if (saved !== undefined) return fitInputsFrom(saved)
  if (query !== '') return decodeFitInputs(query)
  return projectServiceTempC ? { ...DEFAULT_FIT_INPUTS, serviceTempC: projectServiceTempC } : DEFAULT_FIT_INPUTS
}
