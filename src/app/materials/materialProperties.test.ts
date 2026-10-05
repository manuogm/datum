import { describe, expect, it } from 'vitest'
import { materialById, SOURCES } from '../../core/materials'
import { cyclesText, materialDetails, materialSnapshot } from './materialProperties'

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

describe('materialSnapshot', () => {
  it('records the material and its key figures for the project history', () => {
    expect(materialSnapshot(material('ti-6al-4v'))).toEqual({
      tool: 'mat',
      title: 'Ti-6Al-4V Grade 5',
      status: 'pass',
      figures: [
        { label: 'Material', value: 'Ti-6Al-4V Grade 5' },
        { label: 'Rp0.2', value: '880', unit: 'MPa' },
        { label: 'α', value: '8.6', unit: 'µm/(m·K)' },
      ],
      inputs: { materialId: 'ti-6al-4v' },
      materialIds: ['ti-6al-4v'],
    })
  })
})
