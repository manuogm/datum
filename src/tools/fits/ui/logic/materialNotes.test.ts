import { describe, expect, it } from 'vitest'
import { materialById } from '../../../../core/materials'
import { expectOk } from '../../../../core/testing'
import { EXAMPLE_FIT_INPUTS } from '../state/fitInputs'
import { fitResults } from './fitResults'
import { materialNotes } from './materialNotes'

const aluminium = expectOk(materialById('al-7075-t6'))
const steel = expectOk(materialById('steel-42crmo4-qt'))

describe('materialNotes', () => {
  it('warns about a material used above its service limit', () => {
    expect(materialNotes(aluminium, steel, { minC: -20, maxC: 140 }, 'si')).toEqual([
      'Al 7075-T6 is advised for sustained service up to about 120 °C; the service range reaches 140 °C.',
    ])
    expect(materialNotes(aluminium, steel, { minC: -20, maxC: 100 }, 'si')).toEqual([])
  })

  it("says the same as the advisor's notes", () => {
    const results = fitResults(EXAMPLE_FIT_INPUTS, 'imperial')
    expect(results.materialNotes).toEqual(expectOk(results.advice).materialNotes)
  })

  it('is given in calculator mode without a window too', () => {
    const results = fitResults({ ...EXAMPLE_FIT_INPUTS, mode: 'calculator', requiredClearanceUm: null }, 'si')
    expect(results.advice.ok).toBe(false)
    expect(results.materialNotes).toHaveLength(1)
  })
})
