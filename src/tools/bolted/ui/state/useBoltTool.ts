// The Bolted Joint tool's state for one calculation: the inputs (loaded from
// and autosaved to the library, see useCalculationInputs) and the engine
// results derived from them.
import { useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { useCalculationInputs } from '../../../../app/tools/useCalculationInputs'
import type { Calculation } from '../../../../core/library'
import { boltSnapshot } from '../boltSnapshot'
import { boltResults } from '../logic/boltResults'
import { boltReducer } from './boltReducer'
import { boltInputsFrom } from './readInputs'

export function useBoltTool(calculation: Calculation) {
  const { unitSystem } = useSettings()
  const [inputs, dispatch] = useCalculationInputs({ calculation, reducer: boltReducer, inputsFrom: boltInputsFrom, snapshot: boltSnapshot })
  const results = useMemo(() => boltResults(inputs, unitSystem), [inputs, unitSystem])
  return { inputs, dispatch, results }
}
