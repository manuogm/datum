// The Bolted Joint tool's state for one calculation: the inputs (stored or
// unsaved, see useCalculationDraft) and the engine results derived from them.
import { useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { useCalculationDraft } from '../../../../app/tools/useCalculationDraft'
import type { Calculation } from '../../../../core/library'
import { BOLT_TOOL } from '../boltTool'
import { boltResults } from '../logic/boltResults'
import { boltReducer } from './boltReducer'

export function useBoltTool(calculation: Calculation) {
  const { unitSystem } = useSettings()
  const draft = useCalculationDraft(calculation, BOLT_TOOL, boltReducer)
  const results = useMemo(() => boltResults(draft.inputs, unitSystem), [draft.inputs, unitSystem])
  return { ...draft, results }
}
