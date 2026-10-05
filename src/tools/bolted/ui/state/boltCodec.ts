// How Bolted Joint inputs travel in links and revisions, and where a fresh
// calculation starts (see app/tools/toolInputs).
import type { ToolInputsCodec } from '../../../../app/tools/toolInputs'
import { DEFAULT_BOLT_INPUTS, type BoltInputs } from './boltInputs'
import { boltInputsFrom } from './readInputs'
import { boltHref, decodeBoltInputs } from './urlState'

export const BOLT_INPUTS_CODEC: ToolInputsCodec<BoltInputs> = {
  decode: decodeBoltInputs,
  fromSaved: boltInputsFrom,
  href: (inputs) => boltHref(inputs),
  fresh: (projectServiceTempC) => (projectServiceTempC ? { ...DEFAULT_BOLT_INPUTS, serviceTempC: projectServiceTempC } : DEFAULT_BOLT_INPUTS),
}
