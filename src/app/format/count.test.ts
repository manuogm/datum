import { describe, expect, it } from 'vitest'
import { countOf } from './count'

describe('countOf', () => {
  it('uses the singular only for exactly one', () => {
    expect(countOf(1, 'calc')).toBe('1 calc')
    expect(countOf(2, 'calc')).toBe('2 calcs')
    expect(countOf(0, 'decision')).toBe('0 decisions')
  })

  it('takes an irregular plural', () => {
    expect(countOf(3, 'analysis', 'analyses')).toBe('3 analyses')
  })
})
