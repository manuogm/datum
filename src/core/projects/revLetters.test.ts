import { describe, expect, it } from 'vitest'
import { revLetter } from './revLetters'

describe('revLetter', () => {
  it('starts at A and counts up', () => {
    expect([0, 1, 2].map(revLetter)).toEqual(['A', 'B', 'C'])
  })

  it('skips I, O, Q, S, X and Z', () => {
    const first20 = Array.from({ length: 20 }, (_, i) => revLetter(i)).join('')
    expect(first20).toBe('ABCDEFGHJKLMNPRTUVWY')
  })

  it('continues with two letters after Y', () => {
    expect(revLetter(19)).toBe('Y')
    expect(revLetter(20)).toBe('AA')
    expect(revLetter(21)).toBe('AB')
    expect(revLetter(39)).toBe('AY')
    expect(revLetter(40)).toBe('BA')
  })

  it('rejects negative or fractional indices', () => {
    expect(() => revLetter(-1)).toThrow(RangeError)
    expect(() => revLetter(1.5)).toThrow(RangeError)
  })
})
