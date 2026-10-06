import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt } from '../state/lamInputs'
import { analyse } from './lamResults'
import { laminateHeadline } from './verdict'

const headlineOf = (changes: Partial<typeof DEFAULT_LAMINATE_INPUTS>) => laminateHeadline(expectOk(analyse({ ...DEFAULT_LAMINATE_INPUTS, ...changes })))

describe('laminateHeadline', () => {
  it('names the critical plies against the target', () => {
    expect(headlineOf({})).toEqual({
      tone: 'warn',
      title: 'Reserve factor 1.27',
      detail: 'Below the 1.50 target · Plies 4–5 (90°) critical in matrix tension',
    })
    expect(headlineOf({ targetReserveFactor: 1.2 })).toMatchObject({ tone: 'ok', detail: expect.stringMatching(/^Meets the 1.20 target/) })
  })

  it('says when the first ply fails', () => {
    expect(headlineOf({ plies: pliesAt([0, 90, 90, 0]) })).toMatchObject({ tone: 'bad', title: expect.stringMatching(/^First ply fails: RF 0\./) })
  })

  it('has nothing to check without load', () => {
    expect(headlineOf({ loads: NO_LOADS })).toMatchObject({ tone: 'ok', title: 'No load applied' })
  })
})
