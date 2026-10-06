// The Fit Tolerance tool's state: the inputs (see useToolInputs for the URL,
// reopened revisions and project pre-fill) and the engine results derived
// from them.
import { useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { useToolInputs } from '../../../../app/tools/useToolInputs'
import { fitResults } from '../logic/fitResults'
import { FIT_INPUTS_CODEC } from './fitCodec'
import type { FitInputs } from './fitInputs'
import { fitReducer, type FitAction } from './fitReducer'

const loadAll = (inputs: FitInputs): FitAction => ({ type: 'change', changes: inputs })

export function useFitTool() {
  const { unitSystem } = useSettings()
  const [inputs, dispatch] = useToolInputs({ tool: 'fit', reducer: fitReducer, load: loadAll, ...FIT_INPUTS_CODEC })
  const results = useMemo(() => fitResults(inputs, unitSystem), [inputs, unitSystem])
  return { inputs, dispatch, results }
}
