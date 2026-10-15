import { describe, expect, it } from 'vitest'
import { MAX_CONTRIBUTORS } from '../../calc'
import { convertedTolerance, nextRowId, stackReducer } from './stackReducer'
import { NEW_STACK_INPUTS, newDimension, type DimensionRow, type LinkSnapshot, type StackInputs } from './stackInputs'

const last: LinkSnapshot = {
  stack: { name: 'Housing: shoulder to circlip groove', nominal: 20.925, mean: 20.96, upperDeviation: 0.17, lowerDeviation: -0.1, sigma: 0.0263 },
  partName: 'Housing', resultName: 'Shoulder to circlip groove', calculationName: 'Housing', folderName: 'Examples', updatedAt: '2026-10-14T14:02:00',
}

const row = (id: string, changes: Partial<DimensionRow> = {}): DimensionRow => ({ ...newDimension(id), ...changes })
const withRows = (...rows: StackInputs['rows']): StackInputs => ({ ...NEW_STACK_INPUTS, mode: 'assembly', rows })
const ids = (inputs: StackInputs) => inputs.rows.map((r) => r.id)

describe('nextRowId', () => {
  it('is r<count + 1>, or the next one free', () => {
    expect(nextRowId([])).toBe('r1')
    expect(nextRowId([row('r1')])).toBe('r2')
    expect(nextRowId([row('r2'), row('r3')])).toBe('r4')
  })
})

describe('stackReducer', () => {
  it('appends an empty dimension, or a geometric one with a position tolerance', () => {
    const one = stackReducer(NEW_STACK_INPUTS, { type: 'addDimension' })
    expect(one.rows).toEqual([newDimension('r1')])
    const two = stackReducer(one, { type: 'addDimension', geometric: true })
    expect(two.rows[1]).toMatchObject({ id: 'r2', nominal: null, tolerance: { kind: 'geometric', characteristic: 'position', zone: null } })
  })

  it('stops adding at the engine limit of contributors', () => {
    const full = withRows(...Array.from({ length: MAX_CONTRIBUTORS }, (_, i) => row(`r${i + 1}`)))
    expect(stackReducer(full, { type: 'addDimension' })).toBe(full)
    expect(stackReducer(full, { type: 'addLink', calcId: 'c1', last })).toBe(full)
    expect(stackReducer(full, { type: 'duplicate', id: 'r1' })).toBe(full)
  })

  it('links a part stack as an adding row', () => {
    expect(stackReducer(withRows(), { type: 'addLink', calcId: 'c1', last }).rows).toEqual([{ kind: 'linked', id: 'r1', sensitivity: 1, calcId: 'c1', last }])
  })

  it('drops the linked rows when switched to Part', () => {
    const inputs = withRows(row('r1'), { kind: 'linked', id: 'r2', sensitivity: 1, calcId: 'c1', last })
    expect(ids(stackReducer(inputs, { type: 'mode', mode: 'part' }))).toEqual(['r1'])
    expect(ids(stackReducer(inputs, { type: 'mode', mode: 'assembly' }))).toEqual(['r1', 'r2'])
  })

  it('flips the direction and keeps a half when flipped', () => {
    const inputs = withRows(row('r1'))
    const flipped = stackReducer(inputs, { type: 'flip', id: 'r1' })
    expect(flipped.rows[0].sensitivity).toBe(-1)
    const half = stackReducer(flipped, { type: 'half', id: 'r1', on: true })
    expect(half.rows[0].sensitivity).toBe(-0.5)
    expect(stackReducer(half, { type: 'flip', id: 'r1' }).rows[0].sensitivity).toBe(0.5)
    expect(stackReducer(half, { type: 'half', id: 'r1', on: false }).rows[0].sensitivity).toBe(-1)
  })

  it('edits only the row named', () => {
    const inputs = withRows(row('r1'), row('r2'))
    const next = stackReducer(inputs, { type: 'row', id: 'r2', changes: { label: 'Spacer', nominal: 5 } })
    expect(next.rows[0]).toBe(inputs.rows[0])
    expect(next.rows[1]).toMatchObject({ label: 'Spacer', nominal: 5 })
  })

  it('duplicates a row just after it, with an id of its own', () => {
    const inputs = withRows(row('r1', { label: 'A' }), row('r2'))
    const next = stackReducer(inputs, { type: 'duplicate', id: 'r1' })
    expect(ids(next)).toEqual(['r1', 'r3', 'r2'])
    expect(next.rows[1]).toMatchObject({ label: 'A' })
  })

  it('moves a row and ignores a move out of range', () => {
    const inputs = withRows(row('r1'), row('r2'), row('r3'))
    expect(ids(stackReducer(inputs, { type: 'move', from: 0, to: 2 }))).toEqual(['r2', 'r3', 'r1'])
    expect(ids(stackReducer(inputs, { type: 'move', from: 2, to: 0 }))).toEqual(['r3', 'r1', 'r2'])
    expect(ids(stackReducer(inputs, { type: 'move', from: 0, to: 5 }))).toEqual(['r1', 'r2', 'r3'])
  })

  it('turns a linked row into a dimension with the part nominal and worst-case deviations', () => {
    const inputs = withRows({ kind: 'linked', id: 'r1', sensitivity: -1, calcId: 'c1', last })
    expect(stackReducer(inputs, { type: 'toDimension', id: 'r1' }).rows[0]).toEqual({
      ...newDimension('r1', { kind: 'deviations', upper: 0.17, lower: -0.1 }),
      label: 'Housing: shoulder to circlip groove', sensitivity: -1, nominal: 20.925,
    })
  })

  it('relinks a linked row', () => {
    const inputs = withRows({ kind: 'linked', id: 'r1', sensitivity: -1, calcId: 'c1', last })
    const next = stackReducer(inputs, { type: 'relink', id: 'r1', calcId: 'c2', last: { ...last, partName: 'Cover' } })
    expect(next.rows[0]).toMatchObject({ calcId: 'c2', sensitivity: -1, last: { partName: 'Cover' } })
  })

  it('changes only a geometric tolerance with a geometric edit', () => {
    const inputs = withRows(row('r1'))
    expect(stackReducer(inputs, { type: 'geometric', id: 'r1', changes: { zone: 0.2 } }).rows[0]).toEqual(inputs.rows[0])
  })

  it('clears the chain', () => {
    expect(stackReducer(withRows(row('r1')), { type: 'clearRows' }).rows).toEqual([])
  })
})

describe('convertedTolerance', () => {
  const symmetric = row('r1', { nominal: 40, tolerance: { kind: 'symmetric', plusMinus: 0.1 } })
  const unequal = row('r1', { nominal: 12, tolerance: { kind: 'deviations', upper: 0.05, lower: -0.02 } })

  it('keeps the band: ± ↔ deviations ↔ limits', () => {
    expect(convertedTolerance(symmetric, 'deviations')).toEqual({ kind: 'deviations', upper: 0.1, lower: -0.1 })
    expect(convertedTolerance(symmetric, 'limits')).toEqual({ kind: 'limits', min: 39.9, max: 40.1 })
    expect(convertedTolerance(unequal, 'limits')).toEqual({ kind: 'limits', min: 11.98, max: 12.05 })
  })

  it('makes an unequal band ± of the same width', () => {
    expect(convertedTolerance(unequal, 'symmetric')).toEqual({ kind: 'symmetric', plusMinus: 0.035 })
  })

  it('makes a geometric zone as wide as the band', () => {
    expect(convertedTolerance(symmetric, 'geometric')).toMatchObject({ kind: 'geometric', characteristic: 'position', zone: 0.2 })
  })

  it('leaves the values empty when the band is not known yet', () => {
    const limitsWithoutNominal = row('r1', { tolerance: { kind: 'limits', min: 5.9, max: 6 } })
    expect(convertedTolerance(limitsWithoutNominal, 'symmetric')).toEqual({ kind: 'symmetric', plusMinus: null })
    expect(convertedTolerance(row('r1'), 'limits')).toEqual({ kind: 'limits', min: null, max: null })
  })
})
