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
// A tool may write more on Save than the inputs on screen (ToolDefinition.
// toSave: a stack-up Assembly records the linked part results it used). Save
// is then offered even without an edit, and once it is written the screen
// takes the stored inputs, so they do not count as unsaved.
//
// The screen must be keyed by the calculation id, so that another calculation
// gets a fresh screen (and this hook a fresh start).
import { useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react'
import type { Calculation } from '../../core/library'
import { discardDraft, draftOf, saveDraft, setDraft } from '../library/drafts'
import { libraryActions } from '../library/useLibrary'
import { summaryFor, type ToolDefinition } from './toolDefinition'

export interface CalculationDraft<Inputs, Action> {
  inputs: Inputs
  dispatch: Dispatch<Action>
  /** The inputs on screen differ from the stored ones. */
  unsaved: boolean
  /** Save would write something new: unsaved edits, or what the tool adds on Save (see ToolDefinition.toSave). */
  canSave: boolean
  save: () => void
}

/** Replaces the inputs on screen with the stored ones (after Save wrote what the tool adds to them). */
interface Replace<Inputs> {
  readonly replaceWith: Inputs
}

const isReplace = <Inputs,>(action: unknown): action is Replace<Inputs> =>
  typeof action === 'object' && action !== null && 'replaceWith' in action

const json = (value: unknown) => JSON.stringify(value)

/** What Save writes for these inputs: the inputs, plus what the tool records with them (ToolDefinition.toSave). */
const writesOf = <Inputs,>(tool: ToolDefinition<Inputs>, inputs: Inputs): Inputs => tool.toSave?.(inputs) ?? inputs

export function useCalculationDraft<Inputs, Action>(
  calculation: Calculation,
  tool: ToolDefinition<Inputs>,
  reducer: (inputs: Inputs, action: Action) => Inputs,
): CalculationDraft<Inputs, Action> {
  const { id } = calculation
  const stored = useMemo(() => tool.inputsFrom(calculation.inputs), [tool, calculation.inputs])
  const [inputs, dispatchAny] = useReducer(
    (state: Inputs, action: Action | Replace<Inputs>) => (isReplace<Inputs>(action) ? action.replaceWith : reducer(state, action)),
    undefined,
    () => (draftOf(id)?.inputs as Inputs | undefined) ?? stored,
  )
  const dispatch: Dispatch<Action> = dispatchAny

  // On opening: the summary the tool now gives for the stored inputs.
  useEffect(() => {
    libraryActions.refreshSummary(id, summaryFor(tool, stored))
  }, [id, tool, stored])

  // What Save writes: the inputs, plus what the tool records with them.
  const writes = writesOf(tool, inputs)

  // Inputs that differ from the stored ones are the draft; going back to them drops it.
  const unsaved = useMemo(() => json(inputs) !== json(stored), [inputs, stored])
  useEffect(() => {
    if (unsaved) setDraft(id, { inputs, summarize: () => summaryFor(tool, writesOf(tool, inputs)), toSave: () => writesOf(tool, inputs) })
    else discardDraft(id)
  }, [id, tool, inputs, unsaved])

  // Save wrote what the tool adds to these inputs: the screen takes what is stored.
  const savedWithAdditions = unsaved && json(writes) === json(stored)
  useEffect(() => {
    if (savedWithAdditions) dispatchAny({ replaceWith: stored })
  }, [savedWithAdditions, stored])

  const canSave = unsaved || json(writes) !== json(stored)
  const save = () => {
    if (draftOf(id)) saveDraft(id)
    else if (canSave) libraryActions.saveCalculation(id, writes, summaryFor(tool, writes))
  }

  // Ctrl+S / ⌘S saves, as in any editor (the listener calls the latest save).
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveRef])

  return { inputs, dispatch, unsaved, canSave, save }
}
