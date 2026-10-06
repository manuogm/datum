import { describe, expect, it } from 'vitest'
import { countOf } from './count'

describe('countOf', () => {
  it('uses the singular only for exactly one', () => {
    expect(countOf(1, 'calc')).toBe('1 calc')
    expect(countOf(2, 'calc')).toBe('2 calcs')
    expect(countOf(0, 'folder')).toBe('0 folders')
  })

  it('takes an irregular plural', () => {
    expect(countOf(3, 'analysis', 'analyses')).toBe('3 analyses')
  })
})
