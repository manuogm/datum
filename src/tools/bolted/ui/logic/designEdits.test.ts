import { describe, expect, it } from 'vitest'
import { DEFAULT_JOINT_DESIGN, DEFAULT_PATTERN } from '../state/boltInputs'
import { jointOfKind, needsOuterThread, parseThread, threadDesignation, threadOfNominal } from './designEdits'

describe('threadOfNominal', () => {
  it('takes the coarse pitch', () => {
    expect(threadOfNominal(12)).toEqual({ nominalMm: 12, pitchMm: 1.75 })
  })
})

describe('jointOfKind', () => {
  it('screws a through-bolt into its last plate, 1.5·d deep', () => {
    expect(jointOfKind(DEFAULT_JOINT_DESIGN, 'tapped')).toEqual({ kind: 'tapped', materialId: 'steel-s355', engagementMm: 15 })
  })

  it('keeps the part and engagement of a tapped joint, and leaves an insert outer thread to the engineer', () => {
    const tapped = DEFAULT_PATTERN.jointTypes[1].design
    expect(jointOfKind(tapped, 'insert', 'key-locking')).toEqual({
      kind: 'insert', insert: 'key-locking', materialId: 'ti-6al-4v', engagementMm: 9, outerThread: null,
    })
  })

  it('drops everything for a through-bolt', () => {
    expect(jointOfKind(DEFAULT_PATTERN.jointTypes[2].design, 'through-bolt')).toEqual({ kind: 'through-bolt' })
  })
})

describe('parseThread', () => {
  it('reads the usual ways of writing a thread', () => {
    for (const text of ['M6×1', 'm6x1', ' 6 x 1 ', 'M6*1']) expect(parseThread(text)).toEqual({ nominalMm: 6, pitchMm: 1 })
    expect(parseThread('M8×1,25')).toEqual({ nominalMm: 8, pitchMm: 1.25 })
  })

  it('needs both diameter and pitch', () => {
    for (const text of ['', 'M6', 'M6×', 'x1', 'M0×1']) expect(parseThread(text)).toBeNull()
  })

  it('round-trips with threadDesignation', () => {
    expect(parseThread(threadDesignation({ nominalMm: 10, pitchMm: 1.5 }))).toEqual({ nominalMm: 10, pitchMm: 1.5 })
  })
})

describe('needsOuterThread', () => {
  it('flags only a key-locking insert without its outer thread', () => {
    expect(DEFAULT_PATTERN.jointTypes.map((j) => needsOuterThread(j.design))).toEqual([false, false, false, true])
  })
})
