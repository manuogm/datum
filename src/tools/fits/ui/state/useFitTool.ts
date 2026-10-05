// The Fit Tolerance tool's state: the inputs (one reducer), kept in step with
// the URL so the address bar always holds a shareable link to the
// calculation, and the engine results derived from them.
import { useEffect, useMemo, useReducer } from 'react'
import { fitResults } from '../logic/fitResults'
import { fitReducer } from './fitReducer'
import { decodeFitInputs, fitHref } from './urlState'

/** The query part of the URL hash ('#/fit?d=25' → 'd=25'). */
export function hashQuery(): string {
  return window.location.hash.split('?')[1] ?? ''
}

export function useFitTool() {
  const [inputs, dispatch] = useReducer(fitReducer, undefined, () => decodeFitInputs(hashQuery()))

  // Inputs → URL. replaceState keeps the history clean and fires no hashchange.
  useEffect(() => {
    const href = fitHref(inputs)
    if (window.location.hash !== href) window.history.replaceState(null, '', href)
  }, [inputs])

  // URL → inputs, when a link is followed or the user goes back.
  useEffect(() => {
    const load = () => dispatch({ type: 'change', changes: decodeFitInputs(hashQuery()) })
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [])

  const results = useMemo(() => fitResults(inputs), [inputs])
  return { inputs, dispatch, results }
}
