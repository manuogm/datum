// How Fit Tolerance inputs travel in links and revisions, and where a fresh
// calculation starts (see app/tools/toolInputs).
import { serviceTempOf, type ToolInputsCodec } from '../../../../app/tools/toolInputs'
import { DEFAULT_FIT_INPUTS, type FitInputs } from './fitInputs'
import { fitInputsFrom } from './readInputs'
import { decodeFitInputs, fitHref } from './urlState'

export const FIT_INPUTS_CODEC: ToolInputsCodec<FitInputs> = {
  decode: decodeFitInputs,
  fromSaved: fitInputsFrom,
  href: (inputs) => fitHref(inputs),
  fresh: (targets) => (targets ? { ...DEFAULT_FIT_INPUTS, serviceTempC: serviceTempOf(targets) } : DEFAULT_FIT_INPUTS),
}
