import { describe, expect, it } from 'vitest'
import { materialById, SOURCES } from '../../core/materials'
import { cyclesText, materialDetails } from './materialProperties'

function material(id: string) {
  const found = materialById(id)
  if (!found.ok) throw new Error(found.error)
  return found.value
}

describe('materialDetails', () => {
  it('lists every property with its value, unit and source', () => {
    const { rows, sources } = materialDetails(material('ti-6al-4v'), 'si')
    expect(rows.find((r) => r.label === 'Expansion α')).toEqual({
      label: 'Expansion α', value: '8.6', unit: 'µm/(m·K)', sourceNumber: 1,
    })
    expect(rows.find((r) => r.label.startsWith('Fatigue'))?.label).toBe('Fatigue σ_f 10⁷')
    expect(sources.map((s) => s.source)).toEqual([SOURCES.asmTitanium, SOURCES.judgement])
    expect(sources[1].properties).toEqual(['Max service'])
  })

  it('numbers each distinct source once, in order of first use', () => {
    const { rows, sources } = materialDetails(material('steel-42crmo4-qt'), 'si')
    expect(sources.map((s) => s.source)).toEqual([SOURCES.supplier, SOURCES.en10083, SOURCES.judgement])
    expect(rows.find((r) => r.label === 'Yield Rp0.2')?.sourceNumber).toBe(2)
  })

  it('shows a dash for values the dataset does not give', () => {
    const { rows } = materialDetails(material('cfrp-ud-0'), 'si')
    expect(rows.find((r) => r.label === 'Yield Rp0.2')?.value).toBe('—')
  })

  it('adds the lamina data of a composite ply, from its own source', () => {
    const { lamina, sources } = materialDetails(material('cfrp-im7-8552-ud'), 'si')
    expect(lamina?.form).toBe('ud')
    expect(lamina?.rows.map((r) => r.label)).toEqual([
      'Modulus E1', 'Modulus E2', 'Shear modulus G12', "Poisson's ν12", 'Tension Xt', 'Compression Xc', 'Tension Yt', 'Compression Yc', 'Shear S', 'Ply thickness t',
    ])
    expect(lamina?.rows[1]).toMatchObject({ value: '9.1', unit: 'GPa' })
    expect(lamina?.rows[9]).toMatchObject({ value: '0.125', unit: 'mm' })
    expect(sources[(lamina?.rows[0].sourceNumber ?? 0) - 1].properties).toContain('Ply data')
    expect(materialDetails(material('ti-6al-4v'), 'si').lamina).toBeNull()
  })

  it('converts to Imperial', () => {
    const { rows } = materialDetails(material('ti-6al-4v'), 'imperial')
    expect(rows.find((r) => r.label === 'Yield Rp0.2')).toMatchObject({ value: '127.6', unit: 'ksi' })
  })
})

describe('cyclesText', () => {
  it('writes cycle counts as powers of ten', () => {
    expect(cyclesText(1e7)).toBe('10⁷')
    expect(cyclesText(5e8)).toBe('5·10⁸')
  })
})
