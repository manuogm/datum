import { describe, expect, it } from 'vitest'
import { NO_LOADS } from '../state/lamInputs'
import { leadingLoad } from './loads'

describe('leadingLoad', () => {
  it('quotes the largest force, else the largest moment', () => {
    expect(leadingLoad({ ...NO_LOADS, nxNPerMm: 250, nxyNPerMm: -300, mxN: 900 })?.symbol).toBe('Nxy')
    expect(leadingLoad({ ...NO_LOADS, myN: -2, mxN: 1 })?.symbol).toBe('My')
    expect(leadingLoad(NO_LOADS)).toBeNull()
  })
})
