import { describe, expect, it } from 'vitest'
import { DEFAULT_FIT_INPUTS } from './fitInputs'
import { startingInputs } from './startingInputs'

const projectServiceTempC = { minC: -30, maxC: 85 }

describe('startingInputs', () => {
  it('reopens a saved revision first', () => {
    const saved = { ...DEFAULT_FIT_INPUTS, nominalMm: 40 }
    expect(startingInputs({ saved, query: 'd=10', projectServiceTempC })).toEqual(saved)
  })

  it('follows a shared link next, without project pre-fill', () => {
    expect(startingInputs({ query: 'd=10', projectServiceTempC })).toEqual({ ...DEFAULT_FIT_INPUTS, nominalMm: 10 })
  })

  it("starts a fresh calculation at the active project's service temperatures", () => {
    expect(startingInputs({ query: '', projectServiceTempC })).toEqual({ ...DEFAULT_FIT_INPUTS, serviceTempC: projectServiceTempC })
    expect(startingInputs({ query: '' })).toEqual(DEFAULT_FIT_INPUTS)
  })
})
