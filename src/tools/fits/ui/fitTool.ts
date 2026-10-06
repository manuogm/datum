// The Fit Tolerance tool as the library sees it: where a new calculation starts,
// how stored inputs are read back and how a result is summarised.
import type { ToolDefinition } from '../../../app/tools/toolDefinition'
import { fitSnapshot } from './fitSnapshot'
import { DEFAULT_FIT_INPUTS, type FitInputs } from './state/fitInputs'
import { fitInputsFrom } from './state/readInputs'

export const FIT_TOOL: ToolDefinition<FitInputs> = {
  defaultInputs: DEFAULT_FIT_INPUTS,
  inputsFrom: fitInputsFrom,
  snapshot: fitSnapshot,
}
