import { describe, expect, it } from 'vitest'
import { BOLT_INPUTS_CODEC } from './boltCodec'
import { DEFAULT_BOLT_INPUTS } from './boltInputs'

describe('BOLT_INPUTS_CODEC', () => {
  it("starts a fresh calculation at the active project's service temperatures", () => {
    const projectServiceTempC = { minC: -40, maxC: 70 }
    expect(BOLT_INPUTS_CODEC.fresh(projectServiceTempC)).toEqual({ ...DEFAULT_BOLT_INPUTS, serviceTempC: projectServiceTempC })
    expect(BOLT_INPUTS_CODEC.fresh()).toEqual(DEFAULT_BOLT_INPUTS)
  })
})
