import { describe, expect, it } from 'vitest'
import { HOME, parseHash, routeHref, type Route } from './routes'

describe('parseHash', () => {
  it('maps an empty hash and #/ to the top-level folder', () => {
    expect(parseHash('')).toEqual(HOME)
    expect(parseHash('#/')).toEqual(HOME)
  })

  it('parses folders, calculations, reports and materials', () => {
    expect(parseHash('#/folder/f1')).toEqual({ name: 'home', folderId: 'f1' })
    expect(parseHash('#/calc/c1')).toEqual({ name: 'calc', id: 'c1' })
    expect(parseHash('#/calc/c1/report')).toEqual({ name: 'report', id: 'c1' })
    expect(parseHash('#/materials')).toEqual({ name: 'materials' })
  })

  it('tolerates a trailing slash and ignores a query', () => {
    expect(parseHash('#/calc/c1/')).toEqual({ name: 'calc', id: 'c1' })
    expect(parseHash('#/calc/c1/report?print=1')).toEqual({ name: 'report', id: 'c1' })
  })

  it('names no screen for unknown and old addresses', () => {
    for (const hash of ['#/nope', '#/fit', '#/fit/report', '#/projects/P-0142', '#/mat', '#/calc', '#/calc/c1/x', '#/folder/']) {
      expect(parseHash(hash)).toBeNull()
    }
  })
})

describe('routeHref', () => {
  it('round-trips through parseHash', () => {
    const routes: Route[] = [
      HOME,
      { name: 'home', folderId: 'a b/c' },
      { name: 'calc', id: 'x/1' },
      { name: 'report', id: 'x1' },
      { name: 'materials' },
    ]
    for (const route of routes) expect(parseHash(routeHref(route))).toEqual(route)
  })
})
