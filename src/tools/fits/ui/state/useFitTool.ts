// The Fit Tolerance tool's state for one calculation: the inputs (loaded from
// and autosaved to the library, see useCalculationInputs) and the engine
// results derived from them.
import { useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { useCalculationInputs } from '../../../../app/tools/useCalculationInputs'
import type { Calculation } from '../../../../core/library'
import { fitSnapshot } from '../fitSnapshot'
import { fitResults } from '../logic/fitResults'
import { fitReducer } from './fitReducer'
import { fitInputsFrom } from './readInputs'

export function useFitTool(calculation: Calculation) {
  const { unitSystem } = useSettings()
  const [inputs, dispatch] = useCalculationInputs({ calculation, reducer: fitReducer, inputsFrom: fitInputsFrom, snapshot: fitSnapshot })
  const results = useMemo(() => fitResults(inputs, unitSystem), [inputs, unitSystem])
  return { inputs, dispatch, results }
}
