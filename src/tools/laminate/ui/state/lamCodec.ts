// How Composite Laminate inputs travel in links and revisions, and where a
// fresh calculation starts: the example laminate held to the active
// project's composite reserve factor (see app/tools/toolInputs).
import type { ToolInputsCodec } from '../../../../app/tools/toolInputs'
import { DEFAULT_LAMINATE_INPUTS, type LaminateInputs } from './lamInputs'
import { lamInputsFrom } from './readInputs'
import { decodeLamInputs, lamHref } from './urlState'

export const LAM_INPUTS_CODEC: ToolInputsCodec<LaminateInputs> = {
  decode: decodeLamInputs,
  fromSaved: lamInputsFrom,
  href: (inputs) => lamHref(inputs),
  fresh: (targets) => (targets ? { ...DEFAULT_LAMINATE_INPUTS, targetReserveFactor: targets.minReserveFactorComposite } : DEFAULT_LAMINATE_INPUTS),
}
