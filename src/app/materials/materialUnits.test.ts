import { describe, expect, it } from 'vitest'
import { formatMaterialValue, materialUnit } from './materialUnits'

describe('formatMaterialValue', () => {
  it('shows SI values as stored, with fixed decimals', () => {
    expect(formatMaterialValue('density', 'si', 4.43)).toBe('4.43')
    expect(formatMaterialValue('modulus', 'si', 210)).toBe('210.0')
    expect(formatMaterialValue('strength', 'si', 880)).toBe('880')
    expect(formatMaterialValue('expansion', 'si', 8.6)).toBe('8.6')
    expect(formatMaterialValue('temperature', 'si', 350)).toBe('350')
  })

  it('converts to Imperial', () => {
    expect(formatMaterialValue('density', 'imperial', 7.85)).toBe('0.284') // steel ≈ 0.284 lb/in³
    expect(formatMaterialValue('modulus', 'imperial', 200)).toBe('29.0') // 29 Msi
    expect(formatMaterialValue('strength', 'imperial', 880)).toBe('127.6')
    expect(formatMaterialValue('conductivity', 'imperial', 6.7)).toBe('3.9')
    expect(formatMaterialValue('temperature', 'imperial', 350)).toBe('662')
    expect(formatMaterialValue('expansion', 'imperial', 8.6)).toBe('4.8')
  })

  it('names the units', () => {
    expect(materialUnit('expansion', 'si')).toBe('µm/(m·K)')
    expect(materialUnit('density', 'imperial')).toBe('lb/in³')
    expect(materialUnit('temperature', 'imperial')).toBe('°F')
  })
})
