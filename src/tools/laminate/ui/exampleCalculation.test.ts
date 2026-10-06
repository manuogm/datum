import { describe, expect, it } from 'vitest'
import { EXAMPLE_SUMMARIES, summaryOf } from '../../../core/library'
import { expectOk } from '../../../core/testing'
import { lamSnapshot } from './lamSnapshot'
import { lamInputsFrom } from './state/readInputs'

describe('the Composite Laminate example in the seeded library', () => {
  it('lists what the tool computes for its example', () => {
    // The example is stored without inputs; the tool opens it on its defaults.
    expect(summaryOf(expectOk(lamSnapshot(lamInputsFrom(null))))).toEqual(EXAMPLE_SUMMARIES.lam)
  })
})
