import { describe, expect, it } from 'vitest'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt } from './lamInputs'
import { lamInputsFrom } from './readInputs'

const viaJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown

describe('lamInputsFrom', () => {
  it('reads complete inputs unchanged', () => {
    const inputs = { plies: pliesAt([45, -45], 'cfrp-im7-8552-ud'), loads: { ...NO_LOADS, mxN: 12 }, criterion: 'max-stress', targetReserveFactor: 1.25 } as const
    expect(lamInputsFrom(viaJson(inputs))).toEqual(inputs)
    expect(lamInputsFrom(viaJson(DEFAULT_LAMINATE_INPUTS))).toEqual(DEFAULT_LAMINATE_INPUTS)
  })

  it('falls back to the default stack when any ply is unusable', () => {
    expect(lamInputsFrom({ plies: [{ materialId: 'al-7075-t6', angleDeg: 0 }] }).plies).toEqual(DEFAULT_LAMINATE_INPUTS.plies)
    expect(lamInputsFrom({ plies: [{ materialId: 'cfrp-t700-m21-ud', angleDeg: '0' }] }).plies).toEqual(DEFAULT_LAMINATE_INPUTS.plies)
    expect(lamInputsFrom({ plies: [] }).plies).toEqual(DEFAULT_LAMINATE_INPUTS.plies)
  })

  it('reduces angles to −90° < θ ≤ 90°', () => {
    expect(lamInputsFrom({ plies: [{ materialId: 'cfrp-t700-m21-ud', angleDeg: 135 }] }).plies).toEqual(pliesAt([-45]))
  })

  it('takes a load that is not given as 0, and keeps the default for each malformed field', () => {
    const inputs = lamInputsFrom({ loads: { nxNPerMm: 10, myN: 'x' }, criterion: 'puck', targetReserveFactor: -1 })
    expect(inputs).toEqual({ ...DEFAULT_LAMINATE_INPUTS, loads: { ...NO_LOADS, nxNPerMm: 10 } })
    expect(lamInputsFrom(null)).toEqual(DEFAULT_LAMINATE_INPUTS)
  })
})
