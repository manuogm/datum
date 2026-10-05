import { describe, expect, it } from 'vitest'
import { materialById, type Material } from '../../../../core/materials'
import { analyseFitDesignation, type FitAnalysis } from '../../calc'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_FIT_INPUTS } from '../state/fitInputs'
import { serviceClearance } from './serviceClearance'

const aluminium: Material = expectOk(materialById('al-7075-t6'))
const steel: Material = expectOk(materialById('steel-42crmo4-qt'))
const h7g6: FitAnalysis = expectOk(analyseFitDesignation('H7/g6', 25))

describe('serviceClearance', () => {
  it('gives the clearance at the service extremes and at 20 °C', () => {
    const service = serviceClearance(h7g6, DEFAULT_FIT_INPUTS, aluminium, steel)
    // Shift = 25 mm · (23.4 − 11.1) µm/(m·K) = 0.3075 µm/K
    expect(service.bands.map((band) => [band.kind, band.tempC, band.minUm, band.maxUm])).toEqual([
      ['cold', -20, -5.3, 28.7],
      ['reference', 20, 7, 41],
      ['hot', 140, 43.9, 77.9],
    ])
    expect(service.inServiceUm).toEqual({ minUm: -5.3, maxUm: 77.9 })
  })

  it('rates the in-service range against the required window', () => {
    const inputs = (minUm: number, maxUm: number) => ({ ...DEFAULT_FIT_INPUTS, requiredClearanceUm: { minUm, maxUm } })
    expect(serviceClearance(h7g6, inputs(-10, 80), aluminium, steel).status).toBe('pass')
    expect(serviceClearance(h7g6, inputs(0, 40), aluminium, steel).status).toBe('review')
    expect(serviceClearance(h7g6, inputs(100, 200), aluminium, steel).status).toBe('fail')
  })

  it('shows a single band when service is at 20 °C only', () => {
    const inputs = { ...DEFAULT_FIT_INPUTS, serviceTempC: { minC: 20, maxC: 20 } }
    const service = serviceClearance(h7g6, inputs, aluminium, steel)
    expect(service.bands).toHaveLength(1)
    expect(service.inServiceUm).toEqual({ minUm: 7, maxUm: 41 })
  })

  it('fails a range that only touches the window from outside', () => {
    const inputs = { ...DEFAULT_FIT_INPUTS, serviceTempC: { minC: 20, maxC: 20 }, requiredClearanceUm: { minUm: 41, maxUm: 60 } }
    expect(serviceClearance(h7g6, inputs, aluminium, steel).status).toBe('fail')
  })
})
