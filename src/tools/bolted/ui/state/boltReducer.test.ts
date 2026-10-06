import { describe, expect, it } from 'vitest'
import { DEFAULT_BOLT_INPUTS as D } from './boltInputs'
import { boltReducer, nextId } from './boltReducer'

describe('boltReducer', () => {
  it('edits the single joint and its loads', () => {
    const edited = boltReducer(D, { type: 'design', target: { scope: 'joint' }, changes: { propertyClass: '12.9' } })
    expect(edited.joint.design.propertyClass).toBe('12.9')
    expect(edited.pattern).toBe(D.pattern)
    expect(boltReducer(D, { type: 'loads', changes: { transverseN: 0 } }).joint.loads).toEqual({ ...D.joint.loads, transverseN: 0 })
  })

  it('edits one joint type of the pattern', () => {
    const edited = boltReducer(D, { type: 'design', target: { scope: 'jointType', id: 'J2' }, changes: { washers: true } })
    expect(edited.pattern.jointTypes.map((j) => j.design.washers)).toEqual([false, true, false, false])
    expect(edited.joint).toBe(D.joint)
  })

  it('adds a load case as a copy of the one on screen and shows it', () => {
    const added = boltReducer(D, { type: 'addLoadCase' }).pattern
    expect(added.loadCaseId).toBe('LC5')
    expect(added.loadCases.at(-1)).toMatchObject({ id: 'LC5', name: 'Copy of Braking', forceN: D.pattern.loadCases[2].forceN })
  })

  it('removes a load case, showing the first one if it was on screen, but never the last one', () => {
    const removed = boltReducer(D, { type: 'removeLoadCase', id: 'LC3' }).pattern
    expect(removed.loadCases.map((c) => c.id)).toEqual(['LC1', 'LC2', 'LC4'])
    expect(removed.loadCaseId).toBe('LC1')
    const single = { ...D, pattern: { ...D.pattern, loadCases: [D.pattern.loadCases[0]], loadCaseId: 'LC1' } }
    expect(boltReducer(single, { type: 'removeLoadCase', id: 'LC1' })).toEqual(single)
  })

  it('removes only joint types no bolt uses', () => {
    const added = boltReducer(D, { type: 'addJointType', copyOf: 'J2' })
    expect(added.pattern.jointTypes.at(-1)).toEqual({ id: 'J5', design: D.pattern.jointTypes[1].design })
    expect(boltReducer(added, { type: 'removeJointType', id: 'J5' }).pattern.jointTypes).toHaveLength(4)
    expect(boltReducer(D, { type: 'removeJointType', id: 'J1' })).toEqual(D)
  })

  it('adds, moves and removes bolts', () => {
    const added = boltReducer(D, { type: 'addBolt' }).pattern.bolts.at(-1)
    expect(added).toEqual({ id: 'B9', xMm: 115, yMm: 0, jointTypeId: 'J1' })
    const moved = boltReducer(D, { type: 'bolt', id: 'B1', changes: { xMm: -70, jointTypeId: 'J2' } }).pattern.bolts[0]
    expect(moved).toEqual({ id: 'B1', xMm: -70, yMm: -40, jointTypeId: 'J2' })
    expect(boltReducer(D, { type: 'removeBolt', id: 'B8' }).pattern.bolts).toHaveLength(7)
  })
})

describe('nextId', () => {
  it('numbers after the highest id', () => {
    expect(nextId('B', ['B1', 'B7', 'B3'])).toBe('B8')
    expect(nextId('LC', [])).toBe('LC1')
  })
})
