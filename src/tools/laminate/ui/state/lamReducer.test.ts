import { describe, expect, it } from 'vitest'
import { DEFAULT_LAMINATE_INPUTS, pliesAt } from './lamInputs'
import { lamReducer } from './lamReducer'

const angles = (inputs: typeof DEFAULT_LAMINATE_INPUTS) => inputs.plies.map((p) => p.angleDeg)

describe('lamReducer', () => {
  const mixed = { ...DEFAULT_LAMINATE_INPUTS, plies: [...pliesAt([0], 'cfrp-im7-8552-ud'), ...pliesAt([90])] }

  it('re-angles a stack of the same size ply by ply, and fills a new size with the top ply material', () => {
    expect(lamReducer(mixed, { type: 'layup', anglesDeg: [45, -45] }).plies).toEqual([...pliesAt([45], 'cfrp-im7-8552-ud'), ...pliesAt([-45])])
    expect(lamReducer(mixed, { type: 'layup', anglesDeg: [0, 45, 135] }).plies).toEqual(pliesAt([0, 45, -45], 'cfrp-im7-8552-ud'))
    expect(lamReducer(mixed, { type: 'layup', anglesDeg: [] })).toBe(mixed)
    // An optimiser result is of one material: a hybrid stack takes it throughout.
    expect(lamReducer(mixed, { type: 'layup', anglesDeg: [0, 0], materialId: 'cfrp-t700-m21-ud' }).plies).toEqual(pliesAt([0, 0], 'cfrp-t700-m21-ud'))
  })

  it('edits, adds, removes and moves plies', () => {
    const d = DEFAULT_LAMINATE_INPUTS
    expect(lamReducer(d, { type: 'ply', index: 1, changes: { angleDeg: -120 } }).plies[1].angleDeg).toBe(60)
    expect(angles(lamReducer(d, { type: 'addPly' }))).toEqual([0, 45, -45, 90, 90, -45, 45, 0, 0])
    expect(angles(lamReducer(d, { type: 'removePly', index: 0 }))).toEqual([45, -45, 90, 90, -45, 45, 0])
    expect(angles(lamReducer(d, { type: 'movePly', from: 3, to: 0 }))).toEqual([90, 0, 45, -45, 90, -45, 45, 0])
    expect(angles(lamReducer(d, { type: 'movePly', from: 0, to: 2 }))).toEqual([45, -45, 0, 90, 90, -45, 45, 0])
  })

  it('keeps the last ply', () => {
    const single = { ...DEFAULT_LAMINATE_INPUTS, plies: pliesAt([0]) }
    expect(lamReducer(single, { type: 'removePly', index: 0 })).toEqual(single)
  })

  it('merges load changes', () => {
    expect(lamReducer(DEFAULT_LAMINATE_INPUTS, { type: 'loads', changes: { mxN: 5 } }).loads).toEqual({ ...DEFAULT_LAMINATE_INPUTS.loads, mxN: 5 })
  })
})
