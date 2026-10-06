// The Composite Laminate tool as the library sees it: where a new calculation starts,
// how stored inputs are read back and how a result is summarised.
import type { ToolDefinition } from '../../../app/tools/toolDefinition'
import { lamSnapshot } from './lamSnapshot'
import { DEFAULT_LAMINATE_INPUTS, type LaminateInputs } from './state/lamInputs'
import { lamInputsFrom } from './state/readInputs'

export const LAM_TOOL: ToolDefinition<LaminateInputs> = {
  defaultInputs: DEFAULT_LAMINATE_INPUTS,
  inputsFrom: lamInputsFrom,
  snapshot: lamSnapshot,
}
