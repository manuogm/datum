import { describe, expect, it } from 'vitest'
import { seedProjects } from '../../core/projects'
import { parseHash } from '../router/routes'
import { parseReopenLink, reopenRevisionHref } from './reopenLink'

const pin = seedProjects().projects[0].calculations.find((c) => c.id === 'FT-0412')!

describe('reopen links', () => {
  it('point at the tool with the project and revision in the query', () => {
    const href = reopenRevisionHref('P-0142', pin.revisions[2])
    expect(href).toBe('#/fit?rev=P-0142/FT-0412-C')
    expect(parseHash(href)).toEqual({ name: 'fit' })
    expect(parseReopenLink(href)).toEqual({ projectId: 'P-0142', revisionId: 'FT-0412-C' })
  })

  it('ignore hashes without a well-formed revision', () => {
    expect(parseReopenLink('#/fit')).toBeNull()
    expect(parseReopenLink('#/fit?d=25&h=H7')).toBeNull()
    expect(parseReopenLink('#/fit?rev=P-0142')).toBeNull()
    expect(parseReopenLink('#/fit?rev=a/b/c')).toBeNull()
  })

  it('survive other query parameters', () => {
    expect(parseReopenLink('#/fit?d=25&rev=P-0142/FT-0412-B')).toEqual({ projectId: 'P-0142', revisionId: 'FT-0412-B' })
  })
})
