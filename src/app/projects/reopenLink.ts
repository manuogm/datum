// Reopening a saved revision in its tool. The link is the tool's route with
// the revision in the query:
//
//   #/<tool>?rev=<projectId>/<revisionId>      e.g. #/fit?rev=P-0142/FT-0412-C
//
// The tool page calls useReopenedRevision(tool) and, when it returns a
// revision, loads revision.snapshot.inputs into its state.
import { findRevision, type Revision, type RevisionInContext, type ToolId } from '../../core/projects'
import { routeHref } from '../router/routes'
import { useRoute } from '../router/useRoute'
import { useProjects } from './useProjects'

const PARAM = 'rev'

export function reopenRevisionHref(projectId: string, revision: Revision): string {
  const value = `${encodeURIComponent(projectId)}/${encodeURIComponent(revision.id)}`
  return `${routeHref({ name: revision.snapshot.tool })}?${PARAM}=${value}`
}

/** The project and revision named in a hash such as "#/fit?rev=P-0142/FT-0412-C". */
export function parseReopenLink(hash: string): { projectId: string; revisionId: string } | null {
  const value = new URLSearchParams(hash.split('?')[1] ?? '').get(PARAM)
  const [projectId, revisionId, ...rest] = value?.split('/') ?? []
  return projectId && revisionId && rest.length === 0 ? { projectId, revisionId } : null
}

/** The revision the current URL asks this tool to reopen, or null. */
export function useReopenedRevision(tool: ToolId): RevisionInContext | null {
  useRoute() // re-render when the hash changes
  const { projects } = useProjects()
  const link = parseReopenLink(window.location.hash)
  const found = link && findRevision(projects, link.projectId, link.revisionId)
  return found && found.calculation.tool === tool ? found : null
}
