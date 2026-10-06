import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../core/testing'
import { fitSnapshot } from './fitSnapshot'
import { EXAMPLE_FIT_INPUTS, NEW_FIT_INPUTS, type FitInputs } from './state/fitInputs'

describe('fitSnapshot', () => {
  it('describes the calculator fit in calculator mode', () => {
    const inputs = { ...EXAMPLE_FIT_INPUTS, mode: 'calculator' as const }
    const snapshot = expectOk(fitSnapshot(inputs))
    expect(snapshot).toMatchObject({ tool: 'fit', title: 'Ø25 H7/g6', status: 'review', inputs })
    expect(snapshot.figures).toEqual([
      { label: 'C at −20 °C', value: '−5.3 … 28.7', unit: 'µm' },
      { label: 'C at 20 °C', value: '7 … 41', unit: 'µm' },
      { label: 'C at 140 °C', value: '43.9 … 77.9', unit: 'µm' },
    ])
  })

  it("describes the advisor's best match in advisor mode", () => {
    const snapshot = expectOk(fitSnapshot(EXAMPLE_FIT_INPUTS))
    expect(snapshot.title).toBe('Ø25 H7/k6')
    expect(snapshot.figures[0]).toEqual({ label: 'C at −20 °C', value: '−27.3 … 6.7', unit: 'µm' })
  })

  it('is JSON-safe', () => {
    const snapshot = expectOk(fitSnapshot(EXAMPLE_FIT_INPUTS))
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  it("passes on the engine's explanation for an invalid fit", () => {
    const inputs = { ...EXAMPLE_FIT_INPUTS, mode: 'calculator' as const, nominalMm: 5000 }
    expect(expectError(fitSnapshot(inputs))).toMatch(/3150 mm/)
  })

  it('passes a new calculation without a window: nothing is judged, nothing moves with temperature', () => {
    const inputs: FitInputs = { ...NEW_FIT_INPUTS, mode: 'calculator', hole: { kind: 'hole', letter: 'h', grade: '9' }, shaft: { kind: 'shaft', letter: 'd', grade: '9' } }
    const snapshot = expectOk(fitSnapshot(inputs))
    expect(snapshot).toMatchObject({ title: 'Ø25 H9/d9', status: 'pass' })
    expect(snapshot.figures).toEqual([{ label: 'C at 20 °C', value: '65 … 169', unit: 'µm' }])
  })

  it("gives the advisor's verdict on the best match, assembly included", () => {
    const inputs: FitInputs = { ...EXAMPLE_FIT_INPUTS, assembly: 'press', requiredClearanceUm: { minUm: -60, maxUm: 0 }, maxAssemblyInterferenceUm: 5 }
    expect(expectOk(fitSnapshot(inputs)).status).toBe('fail')
  })

  it('fails for a service range the wrong way round in the calculator', () => {
    const inputs: FitInputs = { ...EXAMPLE_FIT_INPUTS, mode: 'calculator', serviceTempC: { minC: 100, maxC: 0 } }
    expect(expectError(fitSnapshot(inputs))).toMatch(/lower to the higher temperature/)
  })
})
