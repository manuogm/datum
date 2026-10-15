import { describe, expect, it } from 'vitest'
import { stackInputsFrom } from './readInputs'
import { EXAMPLE_STACK_INPUTS, NEW_STACK_INPUTS, newDimension, newGeometric } from './stackInputs'

const housingLast = {
  stack: { name: 'Housing: shoulder to circlip groove', nominal: 20.925, mean: 20.96, upperDeviation: 0.17, lowerDeviation: -0.1, sigma: 0.0263 },
  partName: 'Housing', resultName: 'Shoulder to circlip groove', calculationName: 'Housing', folderName: 'Examples', updatedAt: '2026-10-14T14:02:00',
}

describe('stackInputsFrom', () => {
  it('opens the seeded Part example on null', () => {
    expect(stackInputsFrom(null)).toBe(EXAMPLE_STACK_INPUTS)
    expect(stackInputsFrom(undefined)).toBe(EXAMPLE_STACK_INPUTS)
  })

  it('reads back what it was given', () => {
    expect(stackInputsFrom(JSON.parse(JSON.stringify(EXAMPLE_STACK_INPUTS)))).toEqual(EXAMPLE_STACK_INPUTS)
  })

  it('keeps the defaults for fields it cannot read', () => {
    expect(stackInputsFrom({ mode: 'sideways', method: 'monte-carlo', standard: 'din', requirement: { min: 'a', max: Number.NaN }, rows: 'none' }))
      .toEqual(NEW_STACK_INPUTS)
    expect(stackInputsFrom('garbage')).toEqual(NEW_STACK_INPUTS)
  })

  it('leaves out a row it cannot read and keeps the others', () => {
    const inputs = stackInputsFrom({
      rows: [
        { kind: 'dimension', id: 'r1', label: 'Kept', nominal: 5, tolerance: { kind: 'symmetric', plusMinus: 0.1 } },
        { kind: 'dimension', id: 'r2', tolerance: { kind: 'wobble' } },
        { id: 'r3' },
      ],
    })
    expect(inputs.rows).toHaveLength(1)
    expect(inputs.rows[0]).toEqual({ ...newDimension('r1', { kind: 'symmetric', plusMinus: 0.1 }), label: 'Kept', nominal: 5 })
  })

  it('gives a missing or repeated row id a new one', () => {
    const row = { kind: 'dimension', tolerance: { kind: 'symmetric', plusMinus: 0.1 } }
    const ids = stackInputsFrom({ rows: [{ ...row, id: 'a' }, { ...row, id: 'a' }, row] }).rows.map((r) => r.id)
    expect(ids).toEqual(['a', 'r2', 'r3'])
    expect(new Set(ids).size).toBe(3)
  })

  it('reads a coefficient of 0 or a non-number as adding (+1), and keeps ±½', () => {
    const tolerance = { kind: 'symmetric', plusMinus: 0.1 }
    const rows = stackInputsFrom({ rows: [
      { kind: 'dimension', id: 'a', sensitivity: 0, tolerance },
      { kind: 'dimension', id: 'b', sensitivity: '−', tolerance },
      { kind: 'dimension', id: 'c', sensitivity: -0.5, tolerance },
    ] }).rows
    expect(rows.map((r) => r.sensitivity)).toEqual([1, 1, -0.5])
  })

  it('fills a geometric row up to three datum cells and keeps a switched-off modifier', () => {
    const rows = stackInputsFrom({ rows: [{
      kind: 'dimension', id: 'r1', nominal: 25,
      tolerance: { kind: 'geometric', characteristic: 'profile-surface', zone: 0.3, datums: [{ letter: 'A' }], unequal: { on: false, value: 0.1 } },
    }] }).rows
    const tolerance = rows[0].kind === 'dimension' ? rows[0].tolerance : null
    expect(tolerance?.kind).toBe('geometric')
    if (tolerance?.kind !== 'geometric') return
    expect(tolerance.characteristic).toBe('profile-surface')
    expect(tolerance.datums.map((d) => d.letter)).toEqual(['A', '', ''])
    // Saved before typedAs: the number is the ASME Ⓤ value (an ISO offset was saved as zone/2 + offset).
    expect(tolerance.unequal).toEqual({ on: false, value: 0.1, typedAs: 'asme-value', materialSide: 'larger' })
  })

  it('reads an unknown characteristic as position', () => {
    const rows = stackInputsFrom({ rows: [{ kind: 'dimension', id: 'r1', tolerance: { kind: 'geometric', characteristic: 'wobble', zone: 0.1 } }] }).rows
    expect(rows[0]).toEqual({ ...newDimension('r1', newGeometric('position', 0.1)) })
  })

  it('reads a linked row in an assembly and drops it in a part', () => {
    const linked = { kind: 'linked', id: 'r1', sensitivity: 1, calcId: 'c1', last: housingLast }
    expect(stackInputsFrom({ mode: 'assembly', rows: [linked] }).rows).toEqual([linked])
    expect(stackInputsFrom({ mode: 'part', rows: [linked] }).rows).toEqual([])
  })

  it('leaves out a linked row without its last known values or its calculation id', () => {
    const rows = [
      { kind: 'linked', id: 'r1', calcId: 'c1', last: { ...housingLast, stack: { nominal: 1 } } },
      { kind: 'linked', id: 'r2', calcId: '', last: housingLast },
    ]
    expect(stackInputsFrom({ mode: 'assembly', rows }).rows).toEqual([])
  })

  it('works out a missing mean in the last known values from the deviations', () => {
    const { mean: _, ...stack } = housingLast.stack
    const rows = stackInputsFrom({ mode: 'assembly', rows: [{ kind: 'linked', id: 'r1', calcId: 'c1', last: { ...housingLast, stack } }] }).rows
    expect(rows[0].kind === 'linked' && rows[0].last.stack.mean).toBeCloseTo(20.96, 12)
  })
})
