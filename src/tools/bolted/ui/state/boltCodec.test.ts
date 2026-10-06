import { describe, expect, it } from 'vitest'
import { DRAFT } from '../../../../core/projects/testData'
import { BOLT_INPUTS_CODEC } from './boltCodec'
import { DEFAULT_BOLT_INPUTS } from './boltInputs'

describe('BOLT_INPUTS_CODEC', () => {
  it("starts a fresh calculation at the active project's service temperatures", () => {
    expect(BOLT_INPUTS_CODEC.fresh(DRAFT.targets)).toEqual({ ...DEFAULT_BOLT_INPUTS, serviceTempC: { minC: -20, maxC: 160 } })
    expect(BOLT_INPUTS_CODEC.fresh()).toEqual(DEFAULT_BOLT_INPUTS)
  })
})
