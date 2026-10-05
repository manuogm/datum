// The Bolted Joint tool's state: the inputs (see useToolInputs for the URL,
// reopened revisions and project pre-fill) and the engine results derived
// from them.
import { useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { useToolInputs } from '../../../../app/tools/useToolInputs'
import { boltResults } from '../logic/boltResults'
import { BOLT_INPUTS_CODEC } from './boltCodec'
import type { BoltInputs } from './boltInputs'
import { boltReducer, type BoltAction } from './boltReducer'

const loadAll = (inputs: BoltInputs): BoltAction => ({ type: 'change', changes: inputs })

export function useBoltTool() {
  const { unitSystem } = useSettings()
  const [inputs, dispatch] = useToolInputs({ tool: 'bolt', reducer: boltReducer, load: loadAll, ...BOLT_INPUTS_CODEC })
  const results = useMemo(() => boltResults(inputs, unitSystem), [inputs, unitSystem])
  return { inputs, dispatch, results }
}
