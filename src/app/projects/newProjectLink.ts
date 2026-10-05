// Link that opens the Projects page with the New project drawer open
// ('#/projects?new'); routing ignores the query, the Projects page reads it.
import { routeHref } from '../router/routes'

const NEW_PROJECT_QUERY = 'new'

export const NEW_PROJECT_HREF = `${routeHref({ name: 'projects' })}?${NEW_PROJECT_QUERY}`

export function asksForNewProject(hash: string): boolean {
  const query = hash.split('?')[1] ?? ''
  return new URLSearchParams(query).has(NEW_PROJECT_QUERY)
}
