import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { analyseJoint } from './boltResults'
import { shownText, shownValue, stepHeadline } from './trailValues'

describe('shownValue', () => {
  it('shows each trail unit in the viewer’s system', () => {
    expect(shownValue({ value: 27_500, unit: 'N' }, 'si')).toEqual({ value: '27.50', unit: 'kN' })
    expect(shownValue({ value: 4448.222, unit: 'N' }, 'imperial')).toEqual({ value: '1000', unit: 'lbf' })
    expect(shownValue({ value: 846, unit: 'MPa' }, 'si')).toEqual({ value: '846', unit: 'MPa' })
    expect(shownValue({ value: 57.99, unit: 'mm²' }, 'si')).toEqual({ value: '57.99', unit: 'mm²' })
    expect(shownValue({ value: 3.2e-6, unit: 'mm/N' }, 'si')).toEqual({ value: '3.200', unit: 'µm/kN' })
    expect(shownValue({ value: 62.04, unit: 'N·m' }, 'imperial')).toEqual({ value: '45.8', unit: 'lbf·ft' })
  })

  it('shows ratios with two decimals and angles in degrees', () => {
    expect(shownValue({ value: 0.3219, unit: '' }, 'imperial')).toEqual({ value: '0.32', unit: '' })
    expect(shownText({ value: 33.04, unit: '°' }, 'si')).toBe('33.0 °')
    expect(shownText({ value: 1.4512, unit: '' }, 'si')).toBe('1.45')
  })
})

describe('stepHeadline', () => {
  const steps = expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si')).steps
  const headline = (id: string) => stepHeadline(steps.find((s) => s.id === id)!, 'si')

  it('shows a check\'s safety factor, the preload range and otherwise the result', () => {
    expect(headline('slip')).toEqual({ symbol: 'SF', value: expect.stringMatching(/^\d\.\d\d$/), unit: '' })
    expect(headline('preload-range')).toEqual({ symbol: 'FM', value: expect.stringMatching(/^\d+\.\d\d – \d+\.\d\d$/), unit: 'kN' })
    expect(headline('tightening-torque')).toMatchObject({ symbol: 'MA', unit: 'N·m' })
    expect(headline('engagement')).toEqual({ symbol: '', value: '—', unit: '' })
  })
})
