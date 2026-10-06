import { describe, expect, it } from 'vitest'
import { angleText, formatFactor, plyMaterialName, plyRangeText } from './labels'

describe('laminate labels', () => {
  it('signs every angle but 0° and 90°', () => {
    expect([0, 90, 45, -45, 22.5].map(angleText)).toEqual(['0', '90', '+45', '−45', '+22.5'])
  })

  it('joins runs of plies', () => {
    expect(plyRangeText([5, 4])).toBe('4–5')
    expect(plyRangeText([1, 8])).toBe('1, 8')
    expect(plyRangeText([2, 3, 6, 7])).toBe('2–3, 6–7')
  })

  it('writes ∞ for a laminate without load', () => {
    expect(formatFactor(1.266)).toBe('1.27')
    expect(formatFactor(Infinity)).toBe('∞')
  })

  it('names ply materials', () => {
    expect(plyMaterialName('cfrp-t700-m21-ud')).toBe('CFRP T700/M21 UD')
  })
})
