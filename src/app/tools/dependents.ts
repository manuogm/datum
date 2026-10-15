// Calculations whose result depends on other calculations: a Tolerance
// Stack-up Assembly reads the saved results of the Part stacks it links.
// When such a part is saved again or deleted, each assembly that links it
//   - records what the tool asks to keep (ToolDefinition.afterLinkedChange:
//     the part's last saved values when its link just broke, so a deleted
//     part leaves the assembly with them, as the delete dialog says), in its
//     stored inputs and in its unsaved draft if it has one;
//   - gets its summary on Home worked out again, so Home does not show a
//     stale status.
// Neither counts as an edit: the assembly's "last saved" time stays, and
// opening it shows which link changed.
import { findCalculation, type Library } from '../../core/library'
import { assembliesLinking } from '../../tools/stackup/ui/state/linkedParts'
import { draftOf, setDraft } from '../library/drafts'
import { getSnapshot } from '../library/libraryStore'
import { libraryActions, onCalculationsChanged } from '../library/useLibrary'
import { summaryFor } from './toolDefinition'
import { loadToolDefinition } from './toolModules'
import { draftFor } from './useCalculationDraft'

/**
 * Brings the calculations that depend on these ones up to date. `before` is
 * the library just before they were saved or deleted (where a deleted part
 * can still be read).
 */
export async function refreshDependents(ids: readonly string[], before: Library): Promise<void> {
  for (const dependent of assembliesLinking(getSnapshot().state, ids)) {
    const tool = await loadToolDefinition(dependent.tool)
    // Read again: the library may have changed while the tool loaded.
    const after = getSnapshot().state
    const current = findCalculation(after, dependent.id)
    if (!current) continue
    const stored = tool.inputsFrom(current.inputs)
    const recorded = tool.afterLinkedChange?.(stored, before, after) ?? stored
    if (recorded === stored) {
      libraryActions.refreshSummary(current.id, summaryFor(tool, stored))
      continue
    }
    libraryActions.refreshInputs(current.id, recorded, summaryFor(tool, recorded))
    // Unsaved edits keep what was just recorded too, so saving them does not write the older values back.
    const draft = draftOf(current.id)
    if (draft && tool.rebase) setDraft(current.id, draftFor(tool, tool.rebase(tool.inputsFrom(draft.inputs), recorded)))
  }
}

/** Keeps dependents current for as long as the app runs; returns the function that stops it. */
export function keepDependentsCurrent(): () => void {
  return onCalculationsChanged((ids, before) => void refreshDependents(ids, before))
}
