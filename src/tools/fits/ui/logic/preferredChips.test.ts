import { describe, expect, it } from 'vitest'
import { isPreferredFit, preferredFitsOfType } from './preferredChips'

const designations = (nominalMm: number, type: 'clearance' | 'transition' | 'interference') =>
  preferredFitsOfType(nominalMm, type).map((fit) => fit.designation)

describe('preferredFitsOfType', () => {
  it('sorts the preferred fits by the type they give at the size', () => {
    expect(designations(25, 'clearance')).toEqual(['H11/c11', 'H9/d9', 'H8/f7', 'H7/g6', 'H7/h6', 'C11/h11', 'D9/h9', 'F8/h7', 'G7/h6'])
    expect(designations(25, 'transition')).toEqual(['H7/k6', 'H7/n6', 'K7/h6', 'N7/h6'])
    expect(designations(25, 'interference')).toContain('H7/p6')
  })

  it('follows the size: H7/p6 is a transition fit up to 3 mm', () => {
    expect(designations(2, 'transition')).toContain('H7/p6')
    expect(designations(2, 'interference')).not.toContain('H7/p6')
  })
})

describe('isPreferredFit', () => {
  it('knows the preferred fits by designation', () => {
    expect(isPreferredFit('H7/g6')).toBe(true)
    expect(isPreferredFit('H7/k5')).toBe(false)
  })
})
