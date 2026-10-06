import { describe, expect, it } from 'vitest'
import { parseHash, routeHref, sectionOf } from './routes'

describe('parseHash', () => {
  it('maps an empty hash and #/ to home', () => {
    expect(parseHash('')).toEqual({ name: 'home' })
    expect(parseHash('#/')).toEqual({ name: 'home' })
  })

  it('parses tool and section routes', () => {
    for (const name of ['projects', 'fit', 'bolt', 'lam', 'mat'] as const) {
      expect(parseHash(`#/${name}`)).toEqual({ name })
    }
  })

  it('tolerates a trailing slash', () => {
    expect(parseHash('#/fit/')).toEqual({ name: 'fit' })
  })

  it('parses a project id', () => {
    expect(parseHash('#/projects/P-0142')).toEqual({ name: 'project', id: 'P-0142' })
  })

  it('parses the fit report page', () => {
    expect(parseHash('#/fit/report')).toEqual({ name: 'fitReport' })
    expect(parseHash('#/bolt/report?m=pattern')).toEqual({ name: 'boltReport' })
    expect(parseHash('#/lam/report?s=[0/90]s')).toEqual({ name: 'lamReport' })
  })

  it('ignores the query that carries tool inputs', () => {
    expect(parseHash('#/fit?d=25&h=H7')).toEqual({ name: 'fit' })
    expect(parseHash('#/fit/report?d=25&print=1')).toEqual({ name: 'fitReport' })
  })

  it('reports unknown paths', () => {
    expect(parseHash('#/fit/extra')).toEqual({ name: 'notFound', path: 'fit/extra' })
    expect(parseHash('#/nope')).toEqual({ name: 'notFound', path: 'nope' })
  })
})

describe('routeHref', () => {
  it('round-trips through parseHash', () => {
    const routes = [
      { name: 'home' },
      { name: 'fit' },
      { name: 'fitReport' },
      { name: 'boltReport' },
      { name: 'lamReport' },
      { name: 'project', id: 'P 01/a' },
    ] as const
    for (const route of routes) expect(parseHash(routeHref(route))).toEqual(route)
  })
})

describe('sectionOf', () => {
  it('puts a project page under Projects', () => {
    expect(sectionOf({ name: 'project', id: 'P-0142' })).toBe('projects')
    expect(sectionOf({ name: 'fitReport' })).toBe('fit')
    expect(sectionOf({ name: 'boltReport' })).toBe('bolt')
    expect(sectionOf({ name: 'lamReport' })).toBe('lam')
    expect(sectionOf({ name: 'notFound', path: 'x' })).toBeNull()
  })
})
