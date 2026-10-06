// Hash routes of the app. GitHub Pages serves a single index.html under
// /datum/, so screens are addressed by the URL hash:
//
//   #/                       Home: the top-level folder
//   #/folder/<id>            Home showing a folder
//   #/calc/<id>              a calculation, open in its tool
//   #/calc/<id>/report       the calculation's printable report
//   #/materials              the Materials Database
//
// Any other address (including those of earlier Datum versions, e.g. #/fit
// or #/projects) is not a route: the app shows Home instead.

export type Route =
  | { name: 'home'; folderId: string | null }
  | { name: 'calc'; id: string }
  | { name: 'report'; id: string }
  | { name: 'materials' }

export const HOME: Route = { name: 'home', folderId: null }

/** The route of a hash, or null when the hash names no screen. A query (?…) is ignored. */
export function parseHash(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '').replace(/\?.*$/, '').replace(/\/+$/, '')
  if (path === '') return HOME
  const [head, rawId, page, ...extra] = path.split('/')
  if (extra.length > 0) return null
  const id = rawId === undefined || rawId === '' ? null : decodeURIComponent(rawId)
  if (head === 'materials' && rawId === undefined) return { name: 'materials' }
  if (head === 'folder' && id && page === undefined) return { name: 'home', folderId: id }
  if (head === 'calc' && id && page === undefined) return { name: 'calc', id }
  if (head === 'calc' && id && page === 'report') return { name: 'report', id }
  return null
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'home':
      return route.folderId === null ? '#/' : `#/folder/${encodeURIComponent(route.folderId)}`
    case 'calc':
      return `#/calc/${encodeURIComponent(route.id)}`
    case 'report':
      return `#/calc/${encodeURIComponent(route.id)}/report`
    case 'materials':
      return '#/materials'
  }
}

/** Link to a folder on Home (null = the top level). */
export function folderHref(folderId: string | null): string {
  return routeHref({ name: 'home', folderId })
}

export function calcHref(id: string): string {
  return routeHref({ name: 'calc', id })
}

export function reportHref(id: string): string {
  return routeHref({ name: 'report', id })
}
