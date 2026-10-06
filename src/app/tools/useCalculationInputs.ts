// A tool screen's inputs (one reducer) for one calculation of the library.
// The screen starts from the calculation's stored inputs and saves them back
// on its own: 400 ms after the last change, together with the summary of the
// result (status and headline figures), and straight away when the screen
// closes or the page is left. There is no Save button.
//
// Opening a calculation is not an edit: its summary is brought up to date
// (e.g. a new calculation that has none yet) without touching "last edited".
//
// The screen must be keyed by the calculation id, so that another calculation
// gets a fresh screen (and this hook a fresh start).
import { useEffect, useReducer, useRef, type Dispatch } from 'react'
import { summaryOf, type Calculation, type CalculationSummary, type ToolSnapshot } from '../../core/library'
import type { Result } from '../../core/result'
import { libraryActions } from '../library/useLibrary'

export const AUTOSAVE_DELAY_MS = 400

type SnapshotBuilder<Inputs> = (inputs: Inputs) => Result<ToolSnapshot<Inputs>>

/** Pass functions defined at module level. */
interface CalculationInputsOptions<Inputs, Action> {
  calculation: Calculation
  reducer: (inputs: Inputs, action: Action) => Inputs
  /** Stored inputs → inputs (null: the tool's example); anything malformed keeps its default. */
  inputsFrom: (stored: unknown) => Inputs
  /** The tool's snapshot builder: what it reports about the inputs, or why it cannot. */
  snapshot: SnapshotBuilder<Inputs>
}

export function useCalculationInputs<Inputs, Action>({
  calculation,
  reducer,
  inputsFrom,
  snapshot,
}: CalculationInputsOptions<Inputs, Action>): [Inputs, Dispatch<Action>] {
  const [inputs, dispatch] = useReducer(reducer, calculation.inputs, inputsFrom)
  const opened = useRef(inputs)
  // The one save routine, made once: the id and builder never change while the screen is open.
  const autosave = useRef<ReturnType<typeof autosaver<Inputs>> | null>(null)
  autosave.current ??= autosaver(calculation.id, snapshot)

  // On opening: the summary the tool now gives for the stored inputs.
  useEffect(() => {
    autosave.current?.refresh(opened.current)
  }, [])

  // Every change after opening: save once the inputs rest for a moment.
  useEffect(() => {
    if (inputs !== opened.current) autosave.current?.schedule(inputs)
  }, [inputs])

  // Save what is pending when the screen closes or the page goes away.
  useEffect(() => {
    const saver = autosave.current
    if (!saver) return
    window.addEventListener('pagehide', saver.flush)
    return () => {
      window.removeEventListener('pagehide', saver.flush)
      saver.flush()
    }
  }, [])

  return [inputs, dispatch]
}

/** Debounced saving of one calculation's inputs and summary. */
function autosaver<Inputs>(id: string, snapshot: SnapshotBuilder<Inputs>) {
  let pending: { inputs: Inputs } | null = null
  let timer: number | undefined
  const summaryFor = (inputs: Inputs): CalculationSummary | null => {
    const result = snapshot(inputs)
    return result.ok ? summaryOf(result.value) : null
  }
  const flush = () => {
    window.clearTimeout(timer)
    if (!pending) return
    const { inputs } = pending
    pending = null
    libraryActions.saveCalculation(id, inputs, summaryFor(inputs))
  }
  return {
    refresh: (inputs: Inputs) => libraryActions.refreshSummary(id, summaryFor(inputs)),
    schedule: (inputs: Inputs) => {
      pending = { inputs }
      window.clearTimeout(timer)
      timer = window.setTimeout(flush, AUTOSAVE_DELAY_MS)
    },
    flush,
  }
}
