import { describe, expect, it } from 'vitest'
import { newGeometric } from '../state/stackInputs'
import { coefficientText, deviations, outOfSpec, percent, requirementText, signed, significant, toleranceText } from './format'
import { savedText } from './savedText'

describe('format', () => {
  it('writes signed lengths and deviations, a zero without a sign', () => {
    expect(signed('si', 0.17)).toBe('+0.170')
    expect(signed('si', -0.1)).toBe('−0.100')
    expect(signed('si', 0)).toBe('0')
    expect(deviations('si', 0.07, 0)).toBe('+0.070/0')
  })

  it('writes the requirement as a target', () => {
    expect(requirementText('si', { min: 20.8, max: 21.1 })).toBe('20.800 … 21.100')
    expect(requirementText('si', { min: 0.1, max: null })).toBe('≥ 0.100')
    expect(requirementText('si', { min: null, max: 0.5 })).toBe('≤ 0.500')
    expect(requirementText('si', { min: null, max: null })).toBe('none set')
  })

  it('writes a coefficient as a direction', () => {
    expect([1, -1, 0.5, -0.5].map(coefficientText)).toEqual(['+', '−', '+½', '−½'])
    expect(coefficientText(0.866)).toMatch(/^×0\.866$/)
  })

  it('writes shares, indices and the fraction out of spec', () => {
    expect(percent(37.04)).toBe('37.0 %')
    expect(significant(0.026299)).toBe('0.0263')
    expect(significant(1.7712)).toBe('1.77')
    expect(outOfSpec(0.0027)).toBe('0.27 %')
    expect(outOfSpec(1e-9)).toBe('under 0.001 %')
  })

  it('writes each kind of tolerance as entered', () => {
    expect(toleranceText('si', { kind: 'symmetric', plusMinus: 0.05 })).toBe('±0.050')
    expect(toleranceText('si', { kind: 'deviations', upper: 0.07, lower: 0 })).toBe('+0.070/0')
    expect(toleranceText('si', { kind: 'limits', min: 5.9, max: null }, true)).toBe('5.900 … — ⟨ST⟩')
    const position = { ...newGeometric('position', 0.1), diameterZone: true, materialCondition: 'mmc' as const }
    const frame = toleranceText('si', { ...position, datums: [{ ...position.datums[0], letter: 'A' }, { ...position.datums[1], letter: 'B', modifier: 'mmb' }, position.datums[2]] })
    expect(frame).toBe('⌖ | Ø0.100 Ⓜ | A | B Ⓜ')
  })
})

describe('savedText', () => {
  it('writes a stored local time as day, month and clock time', () => {
    expect(savedText('2026-10-14T14:02:00')).toBe('14 Oct, 14:02')
    expect(savedText('2026-01-05T09:30:12.123Z')).toBe('5 Jan, 09:30')
  })

  it('passes through what it cannot read', () => {
    expect(savedText('yesterday')).toBe('yesterday')
    expect(savedText('')).toBe('unknown')
  })
})
