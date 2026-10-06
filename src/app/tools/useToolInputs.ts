// A tool screen's inputs (one reducer), kept in step with the URL so the
// address bar always holds a shareable link to the calculation. A project's
// "Open" link (#/<tool>?rev=…) loads that revision's inputs; a fresh
// calculation takes the active project's design targets.
import { useEffect, useReducer, type Dispatch } from 'react'
import type { ToolId } from '../../core/projects'
import { parseReopenLink, useReopenedRevision } from '../projects/reopenLink'
import { useProjects } from '../projects/useProjects'
import { parseHash } from '../router/routes'
import { hashQuery, startingInputs, type ToolInputsCodec } from './toolInputs'

/** Pass functions defined at module level: the effects re-run when one changes. */
interface ToolInputsOptions<Inputs, Action> extends ToolInputsCodec<Inputs> {
  tool: Extract<ToolId, 'fit' | 'bolt' | 'lam'>
  reducer: (inputs: Inputs, action: Action) => Inputs
  /** The action that replaces all inputs, for a followed link or a reopened revision. */
  load: (inputs: Inputs) => Action
}

export function useToolInputs<Inputs, Action>(options: ToolInputsOptions<Inputs, Action>): [Inputs, Dispatch<Action>] {
  const { tool, reducer, load, decode, fromSaved, href } = options
  const reopened = useReopenedRevision(tool)
  const { activeProject } = useProjects()
  const [inputs, dispatch] = useReducer(reducer, undefined, () => {
    return startingInputs(options, { saved: reopened?.revision.snapshot.inputs, query: hashQuery(), projectTargets: activeProject?.targets })
  })
  // Inputs → URL. replaceState keeps the history clean and fires no hashchange.
  // It also turns a reopen link into the plain link of the loaded inputs.
  useEffect(() => {
    const link = href(inputs)
    if (onRoute(tool) && window.location.hash !== link) window.history.replaceState(null, '', link)
  }, [inputs, href, tool])

  // URL → inputs, when a link is followed or the user goes back.
  useEffect(() => {
    const follow = () => {
      if (onRoute(tool) && !parseReopenLink(window.location.hash)) dispatch(load(decode(hashQuery())))
    }
    window.addEventListener('hashchange', follow)
    return () => window.removeEventListener('hashchange', follow)
  }, [tool, load, decode])

  // A reopen link followed while the screen is open.
  const savedInputs = reopened?.revision.snapshot.inputs
  useEffect(() => {
    if (savedInputs !== undefined) dispatch(load(fromSaved(savedInputs)))
  }, [savedInputs, load, fromSaved])

  return [inputs, dispatch]
}

/** Whether the URL still shows the tool (it no longer does once a link away is followed). */
function onRoute(tool: string): boolean {
  return parseHash(window.location.hash).name === tool
}
