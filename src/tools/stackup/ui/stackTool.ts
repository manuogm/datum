// The Tolerance Stack-up tool as the library sees it: where a new
// calculation starts, how stored inputs are read back, how a result is
// summarised and what Save writes. An Assembly reads the saved results of the
// Part stacks it links from the library, so the summary and Save look them
// up there; Save also records the part values the assembly used.
import { getSnapshot } from '../../../app/library/libraryStore'
import type { ToolDefinition } from '../../../app/tools/toolDefinition'
import { resolveLinks, withLinkSnapshots } from './logic/links'
import { stackSnapshot } from './stackSnapshot'
import { NEW_STACK_INPUTS, type StackInputs } from './state/stackInputs'
import { stackInputsFrom } from './state/readInputs'

const library = () => getSnapshot().state

// A new calculation starts empty (NEW_STACK_INPUTS); the seeded Part example opens on its own (stackInputsFrom(null)).
export const STACK_TOOL: ToolDefinition<StackInputs> = {
  defaultInputs: NEW_STACK_INPUTS,
  inputsFrom: stackInputsFrom,
  snapshot: (inputs) => stackSnapshot(inputs, library()),
  toSave: (inputs) => withLinkSnapshots(inputs, resolveLinks(inputs, library())),
}
