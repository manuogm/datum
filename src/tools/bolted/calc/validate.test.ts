import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk } from '../../../core/testing'
import { analyseBoltedJoint, type BoltedJointInput } from '.'

const s355 = expectOk(materialById('steel-s355'))
const cfrp = expectOk(materialById('cfrp-t700-m21-qi'))

const valid: BoltedJointInput = {
  thread: { nominalMm: 10 },
  propertyClass: '10.9',
  headType: 'hex',
  washers: false,
  joint: { kind: 'through-bolt' },
  plates: [{ material: s355, thicknessMm: 20 }],
  outerDiameterMm: 30,
  tightening: { method: 'torque-wrench' },
  threadFriction: 0.12,
  headFriction: 0.12,
  interfaceFriction: 0.15,
  surfaceRoughness: 'rz-10-to-40',
  loadIntroduction: { position: 'middle' },
  loads: { axialMaxN: 10_000 },
}

describe('invalid input gives an explanation, never an exception', () => {
  it('accepts the valid base case', () => {
    expect(analyseBoltedJoint(valid).ok).toBe(true)
  })

  it.each<[string, Partial<BoltedJointInput>, RegExp]>([
    ['size outside M3 … M36', { thread: { nominalMm: 42 } }, /M42/],
    ['pitch not in ISO 261', { thread: { nominalMm: 10, pitchMm: 2 } }, /M10×2/],
    ['unknown property class', { propertyClass: '14.9' as never }, /14.9/],
    ['unknown head type', { headType: 'pan' as never }, /head type/],
    ['no clamped parts', { plates: [] }, /at least one/],
    ['zero thickness', { plates: [{ material: s355, thicknessMm: 0 }] }, /thickness/],
    ['NaN thickness', { plates: [{ material: s355, thicknessMm: Number.NaN }] }, /thickness/],
    ['material without modulus', { plates: [{ material: { ...s355, youngsModulusGPa: 0 }, thicknessMm: 10 }] }, /Young/],
    ['negative pG', { plates: [{ material: { ...s355, limitingSurfacePressureMPa: -1 }, thicknessMm: 10 }] }, /surface pressure/],
    ['DA inside the hole', { outerDiameterMm: 10 }, /clearance hole/],
    ['shank longer than lK', { shankLengthMm: 25 }, /shank/],
    ['negative shank', { shankLengthMm: -1 }, /shank/],
    ['tightening factor below 1', { tightening: { tighteningFactor: 0.8 } }, /αA/],
    ['unknown tightening method', { tightening: { method: 'by-feel' as never } }, /tightening/],
    ['ν above 1', { utilisation: 1.2 }, /ν/],
    ['friction of 0', { threadFriction: 0 }, /Friction/],
    ['friction of 1.5', { interfaceFriction: 1.5 }, /Friction/],
    ['fractional interfaces', { frictionInterfaces: 1.5 }, /qF/],
    ['unknown roughness', { surfaceRoughness: 'smooth' as never }, /roughness/],
    ['n above 1', { loadIntroduction: { factor: 1.2 } }, /load introduction/],
    ['inverted temperature range', { serviceTempC: { minC: 100, maxC: -20 } }, /temperature range/],
    ['FA,min above FA,max', { loads: { axialMaxN: 1000, axialMinN: 2000 } }, /FA,min/],
    ['infinite axial load', { loads: { axialMaxN: Infinity } }, /axial loads/],
    ['negative transverse load', { loads: { axialMaxN: 0, transverseN: -5 } }, /transverse/],
    ['negative torque', { loads: { axialMaxN: 0, torqueNm: -5 } }, /torque/],
    ['zero friction radius', { loads: { axialMaxN: 0, torqueNm: 5, frictionRadiusMm: 0 } }, /friction radius/],
    ['zero engagement', { joint: { kind: 'tapped', material: s355, engagementMm: 0 } }, /engagement/],
    ['tapped into a composite', { joint: { kind: 'tapped', material: cfrp, engagementMm: 15 } }, /CFRP/],
    ['key-locking insert without outer thread', { joint: { kind: 'insert', insert: 'key-locking', material: s355, engagementMm: 10 } }, /outer thread/],
    ['insert outer thread smaller than the bolt', {
      joint: { kind: 'insert', insert: 'key-locking', material: s355, engagementMm: 10, outerThread: { nominalMm: 8, pitchMm: 1 } },
    }, /larger than the bolt/],
  ])('%s', (_name, change, message) => {
    expect(() => analyseBoltedJoint({ ...valid, ...change })).not.toThrow()
    expect(expectError(analyseBoltedJoint({ ...valid, ...change }))).toMatch(message)
  })
})
