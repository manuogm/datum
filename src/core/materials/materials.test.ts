import { describe, expect, it } from 'vitest'
import { MATERIAL_FAMILIES, MATERIALS, materialById, materialsInFamily, sourceOf, SOURCES, type MaterialFamily } from '.'

describe('materials dataset', () => {
  it('has unique ids', () => {
    const ids = MATERIALS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every material shown on the Materials Database screen', () => {
    const names = MATERIALS.map((m) => m.name)
    for (const shown of [
      'Al 7075-T6', 'Al 6082-T6', 'Al 2618-T61', 'Ti-6Al-4V Grade 5', 'Ti-5553', '42CrMo4 +QT', '300M',
      '17-4PH H900', 'A4-80 (316)', 'Inconel 718', 'Cu-ETP', 'CFRP T700/M21 QI', 'CFRP UD 0°',
      'GFRP E-glass QI', 'PEEK', 'PA66-GF30',
    ]) expect(names).toContain(shown)
  })

  it.each(MATERIALS.map((m) => [m.name, m] as const))('%s has physically plausible values', (_, m) => {
    expect(m.densityGPerCm3).toBeGreaterThan(1)
    expect(m.densityGPerCm3).toBeLessThan(10)
    expect(m.youngsModulusGPa).toBeGreaterThan(1)
    expect(m.thermalExpansionUmPerMK).toBeGreaterThanOrEqual(0)
    if (m.poissonsRatio !== null) expect(m.poissonsRatio).toBeGreaterThan(0)
    if (m.poissonsRatio !== null) expect(m.poissonsRatio).toBeLessThan(0.5)
    if (m.yieldStrengthMPa !== null && m.tensileStrengthMPa !== null) {
      expect(m.yieldStrengthMPa).toBeLessThanOrEqual(m.tensileStrengthMPa)
    }
  })

  it('names a known source for every value', () => {
    for (const m of MATERIALS) {
      expect(Object.keys(SOURCES)).toContain(m.sources.default)
      for (const id of Object.values(m.sources.overrides ?? {})) expect(Object.keys(SOURCES)).toContain(id)
    }
  })
})

describe('lookup', () => {
  it('finds a material by id', () => {
    const steel = materialById('steel-42crmo4-qt')
    expect(steel.ok && steel.value.thermalExpansionUmPerMK).toBe(11.1)
  })

  it('explains an unknown id', () => {
    const result = materialById('unobtainium')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toMatch(/unobtainium/)
  })

  it('lists materials by family, and every family has at least one', () => {
    for (const family of Object.keys(MATERIAL_FAMILIES) as MaterialFamily[]) {
      const members = materialsInFamily(family)
      expect(members.length, family).toBeGreaterThan(0)
      expect(members.every((m) => m.family === family)).toBe(true)
    }
  })

  it('gives the source of a value, honouring per-property overrides', () => {
    const s355 = MATERIALS.find((m) => m.id === 'steel-s355')!
    expect(sourceOf(s355, 'yieldStrengthMPa')).toBe(SOURCES.en10025)
    expect(sourceOf(s355, 'thermalExpansionUmPerMK')).toBe(SOURCES.en1993)
    expect(sourceOf(s355, 'maxServiceTempC').kind).toBe('judgement')
  })
})
