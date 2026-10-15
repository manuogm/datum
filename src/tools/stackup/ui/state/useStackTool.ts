// The Tolerance Stack-up tool's state for one calculation: the inputs (stored
// or unsaved, see useCalculationDraft), and what they give with the linked
// part stacks as the library holds them now. It follows the library, so an
// assembly updates while its part is saved in another tab.
import { useMemo } from 'react'
import { useDrafts } from '../../../../app/library/drafts'
import { useLibrary } from '../../../../app/library/useLibrary'
import { useCalculationDraft } from '../../../../app/tools/useCalculationDraft'
import type { Calculation } from '../../../../core/library'
import { stackResults } from '../logic/stackResults'
import { STACK_TOOL } from '../stackTool'
import { stackReducer } from './stackReducer'

export function useStackTool(calculation: Calculation) {
  const draft = useCalculationDraft(calculation, STACK_TOOL, stackReducer)
  const { library } = useLibrary()
  const drafts = useDrafts()
  const results = useMemo(() => stackResults(draft.inputs, library, (id) => drafts.has(id)), [draft.inputs, library, drafts])
  return { ...draft, library, results }
}
