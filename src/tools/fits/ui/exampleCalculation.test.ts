import { describe, expect, it } from 'vitest'
import { EXAMPLE_SUMMARIES, summaryOf } from '../../../core/library'
import { expectOk } from '../../../core/testing'
import { fitSnapshot } from './fitSnapshot'
import { fitInputsFrom } from './state/readInputs'

describe('the Fit Tolerance example in the seeded library', () => {
  it('lists what the tool computes for its example', () => {
    // The example is stored without inputs; the tool opens it on its defaults.
    expect(summaryOf(expectOk(fitSnapshot(fitInputsFrom(null))))).toEqual(EXAMPLE_SUMMARIES.fit)
  })
})
