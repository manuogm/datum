// The Fit Tolerance tool as the library sees it: where a new calculation starts,
// how stored inputs are read back and how a result is summarised.
import type { ToolDefinition } from '../../../app/tools/toolDefinition'
import { fitSnapshot } from './fitSnapshot'
import { NEW_FIT_INPUTS, type FitInputs } from './state/fitInputs'
import { fitInputsFrom } from './state/readInputs'

// A new calculation starts from neutral inputs (NEW_FIT_INPUTS), not from the
// seeded example's service conditions; the example opens on its own (fitInputsFrom(null)).
export const FIT_TOOL: ToolDefinition<FitInputs> = {
  defaultInputs: NEW_FIT_INPUTS,
  inputsFrom: fitInputsFrom,
  snapshot: fitSnapshot,
}
