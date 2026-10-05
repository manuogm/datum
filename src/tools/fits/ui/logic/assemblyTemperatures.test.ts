import { describe, expect, it } from 'vitest'
import { assemblyTemperatures } from './assemblyTemperatures'

describe('assemblyTemperatures', () => {
  it('gives the housing heating and the practical shaft cooling', () => {
    expect(assemblyTemperatures({ assemblyClearanceUm: 25, housingHeatTempC: 73.83, shaftCoolTempC: -93.5 }, 'si')).toEqual([
      { label: 'Heat housing for assembly', value: '≥ 73.8 °C' },
      { label: 'or cool shaft to', value: '≤ −93.5 °C' },
    ])
  })

  it('leaves out cooling colder than liquid nitrogen', () => {
    expect(assemblyTemperatures({ assemblyClearanceUm: 25, housingHeatTempC: 122.56, shaftCoolTempC: -196.22 }, 'imperial')).toEqual([
      { label: 'Heat housing for assembly', value: '≥ 252.6 °F' },
    ])
  })

  it('offers cooling alone when heating the housing does not help', () => {
    expect(assemblyTemperatures({ assemblyClearanceUm: 25, housingHeatTempC: null, shaftCoolTempC: -80 }, 'si')).toEqual([
      { label: 'Cool shaft for assembly', value: '≤ −80 °C' },
    ])
  })

  it('has no rows when no heating is needed', () => {
    expect(assemblyTemperatures(null, 'si')).toEqual([])
  })
})
