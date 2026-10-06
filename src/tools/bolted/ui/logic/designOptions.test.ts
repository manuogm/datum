import { describe, expect, it } from 'vitest'
import { DEFAULT_JOINT_DESIGN } from '../state/boltInputs'
import { contactOptions, slipOptions, tighteningOptions } from './designOptions'

describe('tighteningOptions', () => {
  it('counts the tightening inputs that differ from a torque wrench at µ 0.12', () => {
    expect(tighteningOptions(DEFAULT_JOINT_DESIGN)).toEqual({ count: 3, changed: 0 })
    expect(tighteningOptions({ ...DEFAULT_JOINT_DESIGN, tightening: 'impact-wrench', threadFriction: 0.1 })).toEqual({ count: 3, changed: 2 })
  })

  it('leaves out the washers and the friction against slip, which have their own places', () => {
    expect(tighteningOptions({ ...DEFAULT_JOINT_DESIGN, washers: true, interfaceFriction: 0.3 })).toEqual({ count: 3, changed: 0 })
  })
})

describe('slipOptions', () => {
  it('counts µT and qF', () => {
    expect(slipOptions(DEFAULT_JOINT_DESIGN)).toEqual({ count: 2, changed: 0 })
    expect(slipOptions({ ...DEFAULT_JOINT_DESIGN, interfaceFriction: 0.3, frictionInterfaces: 2 })).toEqual({ count: 2, changed: 2 })
  })
})

describe('contactOptions', () => {
  it('counts pG of each metal part, the roughness and the load introduction', () => {
    expect(contactOptions(DEFAULT_JOINT_DESIGN)).toEqual({ count: 4, changed: 0 })
    const [first, second] = DEFAULT_JOINT_DESIGN.plates
    const changed = { ...DEFAULT_JOINT_DESIGN, plates: [{ ...first, limitingPressureMPa: 300 }, second], loadIntroduction: 'near-head' as const }
    expect(contactOptions(changed)).toEqual({ count: 4, changed: 2 })
  })

  it('leaves out a polymer part, whose pG is asked for beside it', () => {
    const plates = [{ materialId: 'peek', thicknessMm: 5 }, DEFAULT_JOINT_DESIGN.plates[1]]
    expect(contactOptions({ ...DEFAULT_JOINT_DESIGN, plates })).toEqual({ count: 3, changed: 0 })
  })
})
