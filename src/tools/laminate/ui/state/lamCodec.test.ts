import { describe, expect, it } from 'vitest'
import { DRAFT } from '../../../../core/projects/testData'
import { LAM_INPUTS_CODEC } from './lamCodec'
import { DEFAULT_LAMINATE_INPUTS } from './lamInputs'

describe('LAM_INPUTS_CODEC', () => {
  it("starts a fresh calculation at the active project's composite reserve factor", () => {
    expect(LAM_INPUTS_CODEC.fresh({ ...DRAFT.targets, minReserveFactorComposite: 2 })).toEqual({ ...DEFAULT_LAMINATE_INPUTS, targetReserveFactor: 2 })
    expect(LAM_INPUTS_CODEC.fresh()).toEqual(DEFAULT_LAMINATE_INPUTS)
  })
})
