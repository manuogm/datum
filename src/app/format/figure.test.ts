import { describe, expect, it } from 'vitest'
import { figureText } from './figure'

describe('figureText', () => {
  const range = { label: 'WC', value: '20.825 … 21.095', unit: 'mm', lengthsMm: [20.825, 21.095] }

  it('writes a length figure in the viewer’s unit system', () => {
    expect(figureText(range, 'si')).toBe('WC 20.825 … 21.095 mm')
    expect(figureText(range, 'imperial')).toBe('WC 0.8199 … 0.8305 in')
  })

  it('writes a figure stored without its numbers, or not a length, as stored', () => {
    expect(figureText({ label: 'WC', value: '20.825 … 21.095', unit: 'mm' }, 'imperial')).toBe('WC 20.825 … 21.095 mm')
    expect(figureText({ label: 'Cpk', value: '1.77' }, 'imperial')).toBe('Cpk 1.77')
    expect(figureText({ ...range, lengthsMm: ['x'] as unknown as number[] }, 'imperial')).toBe('WC 20.825 … 21.095 mm')
  })
})
