// The Fit Tolerance tool's state for one calculation: the inputs (stored or
// unsaved, see useCalculationDraft) and the engine results derived from them.
import { useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { useCalculationDraft } from '../../../../app/tools/useCalculationDraft'
import type { Calculation } from '../../../../core/library'
import { FIT_TOOL } from '../fitTool'
import { fitResults } from '../logic/fitResults'
import { fitReducer } from './fitReducer'

export function useFitTool(calculation: Calculation) {
  const { unitSystem } = useSettings()
  const draft = useCalculationDraft(calculation, FIT_TOOL, fitReducer)
  const results = useMemo(() => fitResults(draft.inputs, unitSystem), [draft.inputs, unitSystem])
  return { ...draft, results }
}
