// The Composite Laminate tool's state for one calculation: the inputs (loaded
// from and autosaved to the library, see useCalculationInputs) and the CLT
// analysis derived from them. The analysis is in SI; the screens convert when
// they show it.
import { useMemo } from 'react'
import { useCalculationInputs } from '../../../../app/tools/useCalculationInputs'
import type { Calculation } from '../../../../core/library'
import { lamSnapshot } from '../lamSnapshot'
import { analyse } from '../logic/lamResults'
import { lamReducer } from './lamReducer'
import { lamInputsFrom } from './readInputs'

export function useLaminateTool(calculation: Calculation) {
  const [inputs, dispatch] = useCalculationInputs({ calculation, reducer: lamReducer, inputsFrom: lamInputsFrom, snapshot: lamSnapshot })
  const analysis = useMemo(() => analyse(inputs), [inputs])
  return { inputs, dispatch, analysis }
}
