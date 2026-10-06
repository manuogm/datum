// The Composite Laminate tool's state for one calculation: the inputs (stored
// or unsaved, see useCalculationDraft) and the CLT analysis derived from them.
// The analysis is in SI; the screens convert when they show it.
import { useMemo } from 'react'
import { useCalculationDraft } from '../../../../app/tools/useCalculationDraft'
import type { Calculation } from '../../../../core/library'
import { LAM_TOOL } from '../lamTool'
import { analyse } from '../logic/lamResults'
import { lamReducer } from './lamReducer'

export function useLaminateTool(calculation: Calculation) {
  const draft = useCalculationDraft(calculation, LAM_TOOL, lamReducer)
  const analysis = useMemo(() => analyse(draft.inputs), [draft.inputs])
  return { ...draft, analysis }
}
