// A tool screen's inputs (one reducer) for one calculation of the library.
// The screen starts from the calculation's unsaved draft if it has one (its
// tab was left with edits), else from its stored inputs. Every change that
// makes the inputs differ from what is stored becomes the draft (see
// library/drafts); Save writes it to the library. Nothing is saved on its own.
//
// Opening a calculation also brings its stored summary up to date with what
// the tool now computes (e.g. after an engine fix), without touching "last
// edited".
//
// The screen must be keyed by the calculation id, so that another calculation
// gets a fresh screen (and this hook a fresh start).
import { useEffect, useMemo, useReducer, type Dispatch } from 'react'
import type { Calculation } from '../../core/library'
import { discardDraft, draftOf, saveDraft, setDraft } from '../library/drafts'
import { libraryActions } from '../library/useLibrary'
import { summaryFor, type ToolDefinition } from './toolDefinition'

export interface CalculationDraft<Inputs, Action> {
  inputs: Inputs
  dispatch: Dispatch<Action>
  /** The inputs on screen differ from the stored ones. */
  unsaved: boolean
  save: () => void
}

export function useCalculationDraft<Inputs, Action>(
  calculation: Calculation,
  tool: ToolDefinition<Inputs>,
  reducer: (inputs: Inputs, action: Action) => Inputs,
): CalculationDraft<Inputs, Action> {
  const { id } = calculation
  const stored = useMemo(() => tool.inputsFrom(calculation.inputs), [tool, calculation.inputs])
  const [inputs, dispatch] = useReducer(reducer, undefined, () => (draftOf(id)?.inputs as Inputs | undefined) ?? stored)

  // On opening: the summary the tool now gives for the stored inputs.
  useEffect(() => {
    libraryActions.refreshSummary(id, summaryFor(tool, stored))
  }, [id, tool, stored])

  // Inputs that differ from the stored ones are the draft; going back to them drops it.
  const unsaved = useMemo(() => JSON.stringify(inputs) !== JSON.stringify(stored), [inputs, stored])
  useEffect(() => {
    if (unsaved) setDraft(id, { inputs, summarize: () => summaryFor(tool, inputs) })
    else discardDraft(id)
  }, [id, tool, inputs, unsaved])

  // Ctrl+S / ⌘S saves, as in any editor.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveDraft(id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [id])

  return { inputs, dispatch, unsaved, save: () => saveDraft(id) }
}
