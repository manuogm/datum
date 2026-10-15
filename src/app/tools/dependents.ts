// Calculations whose result depends on other calculations: a Tolerance
// Stack-up Assembly reads the saved results of the Part stacks it links.
// When such a part is saved again or deleted, each assembly that links it
// gets its summary on Home worked out again, so Home does not show a stale
// status. The assembly's own inputs and "last saved" time stay as they were:
// opening it shows which link changed.
import { findCalculation } from '../../core/library'
import { assembliesLinking } from '../../tools/stackup/ui/state/linkedParts'
import { getSnapshot } from '../library/libraryStore'
import { libraryActions, onCalculationsChanged } from '../library/useLibrary'
import { summaryFor } from './toolDefinition'
import { loadToolDefinition } from './toolModules'

/** Works out again the summaries of the calculations that depend on these ones. */
export async function refreshDependents(ids: readonly string[]): Promise<void> {
  for (const dependent of assembliesLinking(getSnapshot().state, ids)) {
    const tool = await loadToolDefinition(dependent.tool)
    // Read again: the library may have changed while the tool loaded.
    const current = findCalculation(getSnapshot().state, dependent.id)
    if (current) libraryActions.refreshSummary(current.id, summaryFor(tool, tool.inputsFrom(current.inputs)))
  }
}

/** Keeps dependents' summaries current for as long as the app runs; returns the function that stops it. */
export function keepDependentsCurrent(): () => void {
  return onCalculationsChanged((ids) => void refreshDependents(ids))
}
