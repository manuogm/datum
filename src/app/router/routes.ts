// Hash routes of the app. GitHub Pages serves a single index.html under
// /datum/, so screens are addressed by the URL hash: #/fit, #/projects/P-0142.
// A tool may append its inputs as a query (#/fit?d=25&h=H7) so a calculation
// can be shared; routing ignores the query and the tool reads it itself.

export type Route =
  | { name: 'home' }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'fit' }
  | { name: 'fitReport' }
  | { name: 'bolt' }
  | { name: 'lam' }
  | { name: 'mat' }
  | { name: 'notFound'; path: string }

export type LinkableRoute = Exclude<Route, { name: 'notFound' }>

/** Top-level areas shown as header tabs. */
export type Section = 'home' | 'projects' | 'fit' | 'bolt' | 'lam' | 'mat'

const SIMPLE_ROUTES = ['projects', 'fit', 'bolt', 'lam', 'mat'] as const

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\?.*$/, '').replace(/\/+$/, '')
  if (path === '') return { name: 'home' }
  const [head, id, ...extra] = path.split('/')
  if (extra.length === 0) {
    if (head === 'projects' && id) return { name: 'project', id: decodeURIComponent(id) }
    if (head === 'fit' && id === 'report') return { name: 'fitReport' }
    const simple = SIMPLE_ROUTES.find((name) => name === head)
    if (simple && id === undefined) return { name: simple }
  }
  return { name: 'notFound', path }
}

export function routeHref(route: LinkableRoute): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'project':
      return `#/projects/${encodeURIComponent(route.id)}`
    case 'fitReport':
      return '#/fit/report'
    default:
      return `#/${route.name}`
  }
}

/** The header tab a route belongs to, if any. */
export function sectionOf(route: Route): Section | null {
  switch (route.name) {
    case 'notFound':
      return null
    case 'project':
      return 'projects'
    case 'fitReport':
      return 'fit'
    default:
      return route.name
  }
}
