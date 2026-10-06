import { describe, expect, it } from 'vitest'
import { materialById } from '../../../../core/materials'
import { analyseFitDesignation } from '../../calc'
import { expectOk } from '../../../../core/testing'
import { EXAMPLE_FIT_INPUTS } from '../state/fitInputs'
import { fitQuantities, limitOfSize, limitsText, thermalQuantities } from './fitQuantities'
import { serviceClearance } from './serviceClearance'

const h7g6 = expectOk(analyseFitDesignation('H7/g6', 25))
const byKey = (system: 'si' | 'imperial') => Object.fromEntries(fitQuantities(h7g6, system).map((q) => [q.key, q]))

describe('fitQuantities', () => {
  const q = byKey('si')

  it('gives limits of size with their formula and numbers (Ø25 H7/g6)', () => {
    expect(q.holeMax).toMatchObject({ value: '25.021', unit: 'mm', formula: 'D + ES', substitution: '25.000 + 0.021' })
    expect(q.shaftMax).toMatchObject({ value: '24.993', substitution: '25.000 − 0.007' })
    expect(q.shaftMin).toMatchObject({ value: '24.980', substitution: '25.000 − 0.020' })
  })

  it('gives tolerances and clearances in µm', () => {
    expect(q.holeTolerance).toMatchObject({ label: 'Hole tolerance IT7', value: '21', substitution: '21 − 0' })
    expect(q.shaftTolerance).toMatchObject({ value: '13', substitution: '−7 − (−20)' })
    expect(q.maxClearance).toMatchObject({ value: '41', unit: 'µm', substitution: '25.021 − 24.980', emphasis: true })
    expect(q.minClearance).toMatchObject({ value: '7', substitution: '25.000 − 24.993' })
    expect(q.meanClearance).toMatchObject({ value: '24', substitution: '(41 + 7) / 2' })
    expect(q.fitTolerance).toMatchObject({ value: '34', substitution: '21 + 13' })
  })

  it('converts every value for Imperial', () => {
    const imperial = byKey('imperial')
    expect(imperial.holeMax).toMatchObject({ value: '0.98507', unit: 'in' })
    expect(imperial.maxClearance).toMatchObject({ value: '1.61', unit: 'thou' })
  })
})

describe('thermalQuantities', () => {
  it('lists the clearance at each service temperature other than 20 °C', () => {
    const service = serviceClearance(h7g6, EXAMPLE_FIT_INPUTS,
      expectOk(materialById('al-7075-t6')), expectOk(materialById('steel-42crmo4-qt')))
    const rows = thermalQuantities(service, 'si')
    expect(rows.map((row) => [row.label, row.value, row.substitution])).toEqual([
      ['Clearance at −20 °C', '−5.3 … 28.7', 'C − 12.3'],
      ['Clearance at 140 °C', '43.9 … 77.9', 'C + 36.9'],
    ])
  })
})

describe('limitsText', () => {
  it('writes a zone as lower → upper limit', () => {
    expect(limitsText(h7g6.hole, 'si')).toBe('25.000 → 25.021')
  })
})

describe('limitOfSize', () => {
  it('keeps millimetres to the µm', () => {
    expect(limitOfSize(24.993, 'si', 'upper')).toBe('24.993')
  })

  it('rounds inches inward at 5 decimals, so no limit is shown wider than it is', () => {
    // 24.993 mm = 0.983976 in: rounding to nearest at 4 decimals gave 0.9840, above the limit.
    expect(limitOfSize(24.993, 'imperial', 'upper')).toBe('0.98397')
    // 24.980 mm = 0.983465 in
    expect(limitOfSize(24.98, 'imperial', 'lower')).toBe('0.98347')
    expect(limitOfSize(25.4, 'imperial', 'upper')).toBe('1.00000')
    expect(limitOfSize(25.4, 'imperial', 'lower')).toBe('1.00000')
  })

  it('writes the limits of a zone the same way', () => {
    expect(limitsText(h7g6.shaft, 'imperial')).toBe('0.98347 → 0.98397')
    // D_min of H7 is 25.000 mm = 0.984252 in, rounded up as a lower limit.
    expect(byKey('imperial').minClearance.substitution).toBe('0.98426 − 0.98397')
  })
})
