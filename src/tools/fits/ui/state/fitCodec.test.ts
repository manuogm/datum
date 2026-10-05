import { describe, expect, it } from 'vitest'
import { FIT_INPUTS_CODEC } from './fitCodec'
import { DEFAULT_FIT_INPUTS } from './fitInputs'

describe('FIT_INPUTS_CODEC', () => {
  it("starts a fresh calculation at the active project's service temperatures", () => {
    const projectServiceTempC = { minC: -30, maxC: 85 }
    expect(FIT_INPUTS_CODEC.fresh(projectServiceTempC)).toEqual({ ...DEFAULT_FIT_INPUTS, serviceTempC: projectServiceTempC })
    expect(FIT_INPUTS_CODEC.fresh()).toEqual(DEFAULT_FIT_INPUTS)
  })

  it('links the inputs it reads back', () => {
    const inputs = { ...DEFAULT_FIT_INPUTS, nominalMm: 40 }
    expect(FIT_INPUTS_CODEC.decode(FIT_INPUTS_CODEC.href(inputs).split('?')[1])).toEqual(inputs)
  })
})
