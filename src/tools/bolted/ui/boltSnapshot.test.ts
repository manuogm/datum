import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../core/testing'
import { boltSnapshot } from './boltSnapshot'
import { DEFAULT_BOLT_INPUTS } from './state/boltInputs'
import { JOINT_PEEK_NO_PG, PATTERN_MISSING_THREAD, PATTERN_WITH_KEENSERT } from './testFixtures'

describe('boltSnapshot', () => {
  it('describes the single joint', () => {
    const snapshot = expectOk(boltSnapshot(DEFAULT_BOLT_INPUTS))
    expect(snapshot).toMatchObject({ tool: 'bolt', title: 'M10 10.9 through-bolt', status: 'fail', inputs: DEFAULT_BOLT_INPUTS })
    expect(snapshot.figures).toEqual([
      { label: 'u max', value: '2.01' },
      { label: 'Governing', value: 'R12 Safety against slipping' },
      { label: 'MA', value: '71.2', unit: 'N·m' },
    ])
  })

  it('names the check behind a review, not the most utilised one', () => {
    const snapshot = expectOk(boltSnapshot(JOINT_PEEK_NO_PG))
    expect(snapshot.status).toBe('review')
    expect(snapshot.figures[1]).toEqual({ label: 'Governing', value: 'R10 Surface pressure under head and nut' })
  })

  it('describes the pattern by its governing bolt and load case', () => {
    const snapshot = expectOk(boltSnapshot(PATTERN_WITH_KEENSERT))
    expect(snapshot.title).toBe('8-bolt pattern, LC3')
    expect(snapshot.figures.map((f) => f.label)).toEqual(['u max', 'Governing', 'Load cases'])
    expect(snapshot.figures[1].value).toBe('B8 (J4) in LC3, R12')
  })

  it('is JSON-safe', () => {
    const snapshot = expectOk(boltSnapshot(PATTERN_WITH_KEENSERT))
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  it("passes on the engine's explanation", () => {
    expect(expectError(boltSnapshot(PATTERN_MISSING_THREAD))).toMatch(/outer thread/)
  })
})
