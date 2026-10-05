import { describe, expect, it } from 'vitest'
import { materialById } from '../../../../core/materials'
import { analyseFitDesignation } from '../../calc'
import { expectOk } from '../../calc/testHelpers'
import { DEFAULT_FIT_INPUTS } from '../state/fitInputs'
import { candidateFor, fitResults } from './fitResults'
import { serviceClearance } from './serviceClearance'
import { reportWarnings, serviceSummary } from './serviceSummary'

const housing = expectOk(materialById('al-7075-t6'))
const shaft = expectOk(materialById('steel-42crmo4-qt'))
const service = (designation: string) =>
  serviceClearance(expectOk(analyseFitDesignation(designation, 25)), DEFAULT_FIT_INPUTS, housing, shaft)

describe('serviceSummary', () => {
  it('states the in-service range against the requirement', () => {
    expect(serviceSummary(service('H7/g6'), DEFAULT_FIT_INPUTS, 'si')).toBe('−5.3 … 77.9 µm over −20 … 140 °C; required 0 … 40 µm')
    expect(serviceSummary(service('H7/g6'), DEFAULT_FIT_INPUTS, 'imperial')).toBe('−0.21 … 3.07 thou over −4 … 284 °F; required 0 … 1.57 thou')
  })
})

describe('reportWarnings', () => {
  const results = fitResults(DEFAULT_FIT_INPUTS)
  const notes = ['Al 7075-T6 is advised for sustained service up to about 120 °C; the service range reaches 140 °C.']

  it("lists the advisor's checks that did not pass, then the material notes", () => {
    const candidate = candidateFor(results, 'H7/g6')
    const warnings = reportWarnings(service('H7/g6'), DEFAULT_FIT_INPUTS, 'si', candidate, notes)
    expect(warnings[0]).toMatch(/48 % inside the required 0 … 40 µm/)
    expect(warnings.at(-1)).toBe(notes[0])
  })

  it('falls back to the in-service result for fits the advisor does not rank', () => {
    const warnings = reportWarnings(service('H6/g5'), DEFAULT_FIT_INPUTS, 'si', undefined, [])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/^In service .* required 0 … 40 µm\.$/)
  })
})
