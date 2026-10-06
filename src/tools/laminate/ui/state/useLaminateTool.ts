// The Composite Laminate tool's state: the inputs (see useToolInputs for the
// URL, reopened revisions and project pre-fill) and the CLT analysis derived
// from them. The analysis is in SI; the screens convert when they show it.
import { useMemo } from 'react'
import { useToolInputs } from '../../../../app/tools/useToolInputs'
import { analyse } from '../logic/lamResults'
import { LAM_INPUTS_CODEC } from './lamCodec'
import type { LaminateInputs } from './lamInputs'
import { lamReducer, type LamAction } from './lamReducer'

const loadAll = (inputs: LaminateInputs): LamAction => ({ type: 'change', changes: inputs })

export function useLaminateTool() {
  const [inputs, dispatch] = useToolInputs({ tool: 'lam', reducer: lamReducer, load: loadAll, ...LAM_INPUTS_CODEC })
  const analysis = useMemo(() => analyse(inputs), [inputs])
  return { inputs, dispatch, analysis }
}
