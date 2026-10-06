import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../core/testing'
import { fitSnapshot } from './fitSnapshot'
import { DEFAULT_FIT_INPUTS } from './state/fitInputs'

describe('fitSnapshot', () => {
  it('describes the calculator fit in calculator mode', () => {
    const inputs = { ...DEFAULT_FIT_INPUTS, mode: 'calculator' as const }
    const snapshot = expectOk(fitSnapshot(inputs))
    expect(snapshot).toMatchObject({ tool: 'fit', title: 'Ø25 H7/g6', status: 'review', inputs })
    expect(snapshot.materialIds).toEqual(['al-7075-t6', 'steel-42crmo4-qt'])
    expect(snapshot.figures).toEqual([
      { label: 'Fit', value: 'H7/g6' },
      { label: 'Nominal', value: '25.000', unit: 'mm' },
      { label: 'C at −20 °C', value: '−5.3 … 28.7', unit: 'µm' },
      { label: 'C at 20 °C', value: '7 … 41', unit: 'µm' },
      { label: 'C at 140 °C', value: '43.9 … 77.9', unit: 'µm' },
    ])
  })

  it("describes the advisor's best match in advisor mode", () => {
    const snapshot = expectOk(fitSnapshot(DEFAULT_FIT_INPUTS))
    expect(snapshot.title).toBe('Ø25 H7/k6')
    expect(snapshot.figures[0]).toEqual({ label: 'Fit', value: 'H7/k6' })
  })

  it('is JSON-safe', () => {
    const snapshot = expectOk(fitSnapshot(DEFAULT_FIT_INPUTS))
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  it("passes on the engine's explanation for an invalid fit", () => {
    const inputs = { ...DEFAULT_FIT_INPUTS, mode: 'calculator' as const, nominalMm: 5000 }
    expect(expectError(fitSnapshot(inputs))).toMatch(/3150 mm/)
  })
})
