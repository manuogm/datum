// The Fit Tolerance tool's state: the inputs (one reducer), kept in step with
// the URL so the address bar always holds a shareable link to the
// calculation, and the engine results derived from them. A project's "Open"
// link (#/fit?rev=…) loads that revision's inputs.
import { useEffect, useMemo, useReducer } from 'react'
import { parseReopenLink, useReopenedRevision } from '../../../../app/projects/reopenLink'
import { useProjects } from '../../../../app/projects/useProjects'
import { parseHash } from '../../../../app/router/routes'
import { useSettings } from '../../../../app/settings/settings'
import { fitResults } from '../logic/fitResults'
import { fitReducer } from './fitReducer'
import { fitInputsFrom } from './readInputs'
import { startingInputs } from './startingInputs'
import { decodeFitInputs, fitHref } from './urlState'

/** The query part of the URL hash ('#/fit?d=25' → 'd=25'). */
export function hashQuery(): string {
  return window.location.hash.split('?')[1] ?? ''
}

/** Whether the URL still shows this tool (it no longer does once a link away is followed). */
function onToolRoute(): boolean {
  return parseHash(window.location.hash).name === 'fit'
}

export function useFitTool() {
  const reopened = useReopenedRevision('fit')
  const { activeProject } = useProjects()
  const { unitSystem } = useSettings()
  const [inputs, dispatch] = useReducer(fitReducer, undefined, () => {
    const targets = activeProject?.targets
    return startingInputs({
      saved: reopened?.revision.snapshot.inputs,
      query: hashQuery(),
      projectServiceTempC: targets && { minC: targets.serviceTempMinC, maxC: targets.serviceTempMaxC },
    })
  })

  // Inputs → URL. replaceState keeps the history clean and fires no hashchange.
  // It also turns a reopen link into the plain link of the loaded inputs.
  useEffect(() => {
    const href = fitHref(inputs)
    if (onToolRoute() && window.location.hash !== href) window.history.replaceState(null, '', href)
  }, [inputs])

  // URL → inputs, when a link is followed or the user goes back.
  useEffect(() => {
    const load = () => {
      if (onToolRoute() && !parseReopenLink(window.location.hash)) dispatch({ type: 'change', changes: decodeFitInputs(hashQuery()) })
    }
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [])

  // A reopen link followed while the screen is open.
  const savedInputs = reopened?.revision.snapshot.inputs
  useEffect(() => {
    if (savedInputs !== undefined) dispatch({ type: 'change', changes: fitInputsFrom(savedInputs) })
  }, [savedInputs])

  const results = useMemo(() => fitResults(inputs, unitSystem), [inputs, unitSystem])
  return { inputs, dispatch, results }
}
