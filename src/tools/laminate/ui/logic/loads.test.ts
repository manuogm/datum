import { describe, expect, it } from 'vitest'
import { NO_LOADS } from '../state/lamInputs'
import { appliedLoadsText, failureLoadNote, leadingLoad } from './loads'

describe('leadingLoad', () => {
  it('quotes the largest force, else the largest moment', () => {
    expect(leadingLoad({ ...NO_LOADS, nxNPerMm: 250, nxyNPerMm: -300, mxN: 900 })?.symbol).toBe('Nxy')
    expect(leadingLoad({ ...NO_LOADS, myN: -2, mxN: 1 })?.symbol).toBe('My')
    expect(leadingLoad(NO_LOADS)).toBeNull()
  })
})

describe('failureLoadNote', () => {
  it('lists the other loads at first-ply failure', () => {
    expect(failureLoadNote({ ...NO_LOADS, nxNPerMm: 316.8, nxyNPerMm: 101.4 }, 'si')).toBe('All loads × RF · Nxy 101.4 N/mm')
    expect(failureLoadNote({ ...NO_LOADS, nxNPerMm: 316.8 }, 'si')).toBeNull()
  })
})

describe('appliedLoadsText', () => {
  it('lists the loads applied', () => {
    expect(appliedLoadsText({ ...NO_LOADS, nxNPerMm: 250, mxN: -12 }, 'si')).toBe('Nx 250.0 N/mm, Mx −12.0 N·mm/mm')
    expect(appliedLoadsText(NO_LOADS, 'si')).toBe('')
  })
})
