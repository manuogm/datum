import { describe, expect, it } from 'vitest'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt, type LaminateInputs } from './lamInputs'
import { decodeLamInputs, encodeLamInputs, lamHref } from './urlState'

describe('Composite Laminate links', () => {
  it('links the defaults without a query', () => {
    expect(lamHref(DEFAULT_LAMINATE_INPUTS)).toBe('#/lam')
    expect(lamHref(DEFAULT_LAMINATE_INPUTS, 'report', true)).toBe('#/lam/report?print=1')
  })

  it('writes a one-material stack as its notation', () => {
    const inputs = { ...DEFAULT_LAMINATE_INPUTS, plies: pliesAt([0, 90, 90, 0], 'cfrp-im7-8552-ud') }
    const query = encodeLamInputs(inputs)
    expect(new URLSearchParams(query).get('s')).toBe('[0/90]s')
    expect(new URLSearchParams(query).get('m')).toBe('cfrp-im7-8552-ud')
    expect(decodeLamInputs(query)).toEqual(inputs)
  })

  it('round-trips a mixed stack, loads, criterion and target', () => {
    const inputs: LaminateInputs = {
      plies: [...pliesAt([45]), ...pliesAt([0], 'cfrp-t300-fabric'), ...pliesAt([-45])],
      loads: { ...NO_LOADS, nyNPerMm: -20.5, mxyN: 3 },
      criterion: 'tsai-hill',
      targetReserveFactor: 2,
    }
    expect(decodeLamInputs(`?${encodeLamInputs(inputs)}`)).toEqual(inputs)
  })

  it('keeps the defaults for anything it cannot read', () => {
    expect(decodeLamInputs('s=[0/9x]&n=1,2&c=puck&rf=abc')).toEqual(DEFAULT_LAMINATE_INPUTS)
  })
})
