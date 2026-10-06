// The Bolted Joint tool as the library sees it: where a new calculation starts,
// how stored inputs are read back and how a result is summarised.
import type { ToolDefinition } from '../../../app/tools/toolDefinition'
import { boltSnapshot } from './boltSnapshot'
import { DEFAULT_BOLT_INPUTS, type BoltInputs } from './state/boltInputs'
import { boltInputsFrom } from './state/readInputs'

export const BOLT_TOOL: ToolDefinition<BoltInputs> = {
  defaultInputs: DEFAULT_BOLT_INPUTS,
  inputsFrom: boltInputsFrom,
  snapshot: boltSnapshot,
}
