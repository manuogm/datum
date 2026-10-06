import { describe, expect, it } from 'vitest'
import { EXAMPLE_SUMMARIES, summaryOf } from '../../../core/library'
import { expectOk } from '../../../core/testing'
import { boltSnapshot } from './boltSnapshot'
import { boltInputsFrom } from './state/readInputs'

describe('the Bolted Joint example in the seeded library', () => {
  it('lists what the tool computes for its example', () => {
    // The example is stored without inputs; the tool opens it on its defaults.
    expect(summaryOf(expectOk(boltSnapshot(boltInputsFrom(null))))).toEqual(EXAMPLE_SUMMARIES.bolt)
  })
})
