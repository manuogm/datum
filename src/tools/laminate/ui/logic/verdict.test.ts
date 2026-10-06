import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt } from '../state/lamInputs'
import { analyse } from './lamResults'
import { laminateHeadline, laminateStatus, plyTally, plyTones } from './verdict'

const headlineOf = (changes: Partial<typeof DEFAULT_LAMINATE_INPUTS>) => laminateHeadline(expectOk(analyse({ ...DEFAULT_LAMINATE_INPUTS, ...changes })))

describe('laminateHeadline', () => {
  it('names the critical plies against the target', () => {
    expect(headlineOf({})).toEqual({
      tone: 'warn',
      title: 'Reserve factor 1.27',
      detail: 'Below the 1.50 target · Plies 4–5 (90°) critical · dominant stress: matrix tension',
    })
    expect(headlineOf({ targetReserveFactor: 1.2 })).toMatchObject({ tone: 'ok', detail: expect.stringMatching(/^Meets the 1.20 target/) })
  })

  it('names the failure mode only where the criterion predicts one', () => {
    expect(headlineOf({ criterion: 'max-stress' }).detail).toMatch(/critical in matrix tension$/)
  })

  it('says when the first ply fails', () => {
    expect(headlineOf({ plies: pliesAt([0, 90, 90, 0]) })).toMatchObject({ tone: 'bad', title: expect.stringMatching(/^First ply fails: RF 0\./) })
  })

  it('has nothing to check without load', () => {
    expect(headlineOf({ loads: NO_LOADS })).toMatchObject({ tone: 'warn', title: 'No load applied' })
  })
})

describe('plyTones and plyTally', () => {
  it('colours each ply by its reserve factor against the target', () => {
    const tones = plyTones(expectOk(analyse(DEFAULT_LAMINATE_INPUTS)))
    expect(tones).toEqual(['ok', 'ok', 'warn', 'warn', 'warn', 'warn', 'ok', 'ok'])
    expect(plyTally(tones)).toEqual({ tone: 'warn', text: '4 below target' })
  })

  it('counts failing plies first', () => {
    expect(plyTally(['ok', 'bad', 'warn', 'bad'])).toEqual({ tone: 'bad', text: '2 fail' })
    expect(plyTally(['ok', 'ok'])).toEqual({ tone: 'ok', text: 'all meet target' })
    expect(plyTally(['ok', 'ok'], false)).toEqual({ tone: 'warn', text: 'no load' })
  })
})

describe('laminateStatus', () => {
  it('is review, not pass, when nothing loads the laminate', () => {
    expect(laminateStatus(expectOk(analyse({ ...DEFAULT_LAMINATE_INPUTS, loads: NO_LOADS })).firstPlyFailure)).toBe('review')
    expect(laminateStatus(expectOk(analyse({ ...DEFAULT_LAMINATE_INPUTS, targetReserveFactor: 1.2 })).firstPlyFailure)).toBe('pass')
  })
})
