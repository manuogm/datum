// Copy for the placeholder screens, one entry per route that is not built yet.
import type { ToolSection } from '../home/homeData'
import type { Route, Section } from '../router/routes'

export interface PlaceholderContent {
  section: Section | null
  eyebrow: string
  title: string
  status: 'next' | 'missing'
  message: string
  scope: string[]
  tool?: ToolSection
}

/** Routes that still show a placeholder (every other route has its own page). */
type PlaceholderRoute = Extract<Route, { name: 'bolt' | 'lam' | 'notFound' }>

export function placeholderFor(route: PlaceholderRoute): PlaceholderContent {
  switch (route.name) {
    case 'bolt':
      return {
        section: 'bolt',
        eyebrow: 'VDI 2230-1 · NASM 33537',
        title: 'Bolted Joint',
        status: 'next',
        message: 'Single joints and bolt patterns with mixed fasteners and inserts. Next on the bench after the fit calculator.',
        scope: [
          'Single joint preload and safety factors',
          'Bolt patterns with load sharing per bolt',
          'Inserts: Helicoil and Keensert',
          'Load cases with governing bolt',
          'Utilisation heat map in plan view',
        ],
        tool: 'bolt',
      }
    case 'lam':
      return {
        section: 'lam',
        eyebrow: 'Classical laminate theory',
        title: 'Composite Laminate',
        status: 'next',
        message: 'Ply stacking, laminate stiffness and first-ply failure, with every number traced to its formula.',
        scope: [
          'Stacking sequence editor',
          'ABD matrix and engineering constants',
          'Ply-by-ply stress and strain',
          'First-ply failure and reserve factors',
        ],
        tool: 'lam',
      }
    case 'notFound':
      return {
        section: null,
        eyebrow: `#/${route.path}`,
        title: 'Page not found',
        status: 'missing',
        message: 'There is no screen at this address. Pick a tool from the tabs above or go back to Home.',
        scope: [],
      }
  }
}
