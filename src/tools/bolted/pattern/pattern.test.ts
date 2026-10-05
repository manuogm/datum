import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk } from '../../fits/calc/testHelpers'
import type { JointDesign } from '../calc'
import { analyseBoltPattern, boltLoads, loadAtCentroid, patternProperties, type BoltPatternInput, type PatternLoadCase } from '.'

const ti64 = expectOk(materialById('ti-6al-4v'))
const al7075 = expectOk(materialById('al-7075-t6'))

const common = {
  washers: false, outerDiameterMm: 30, tightening: { method: 'torque-wrench' }, threadFriction: 0.12, headFriction: 0.12,
  interfaceFriction: 0.15, surfaceRoughness: 'rz-10-to-40', loadIntroduction: { position: 'middle' },
} as const

const m12Through: JointDesign = {
  ...common, thread: { nominalMm: 12 }, propertyClass: '10.9', headType: 'hex',
  joint: { kind: 'through-bolt' }, plates: [{ material: ti64, thicknessMm: 10 }, { material: ti64, thicknessMm: 10 }],
}

const zero = { x: 0, y: 0, z: 0 }
const loadCase = (change: Partial<PatternLoadCase>): PatternLoadCase => ({ forceN: zero, momentNm: zero, ...change })

/** Four bolts on a 100 mm square around (200, 100): centroid (200, 100), Σx² = Σy² = 4 × 50² = 10 000 mm². */
const square = [[150, 50], [250, 50], [150, 150], [250, 150]].map(([xMm, yMm], i) => ({ id: `B${i + 1}`, xMm, yMm, jointTypeId: 'J1' }))
const squareInput = (lc: PatternLoadCase): BoltPatternInput => ({ jointTypes: [{ id: 'J1', name: 'M12 10.9', design: m12Through }], bolts: square, loadCase: lc })
const loadsFor = (lc: PatternLoadCase) => expectOk(analyseBoltPattern(squareInput(lc))).bolts.map((b) => b.load)

describe('rigid-plate load sharing, symmetric square pattern', () => {
  it('finds the centroid and the second moments', () => {
    expect(patternProperties(square)).toEqual({ centroidMm: { x: 200, y: 100 }, ixxMm2: 10_000, iyyMm2: 10_000, ixyMm2: 0, polarMm2: 20_000 })
  })

  it('shares a centric axial force and a shear force equally', () => {
    // 20 kN / 4 = 5 kN tension each; Fx 8 kN / 4 = 2 kN shear each
    for (const load of loadsFor(loadCase({ forceN: { x: 8_000, y: 0, z: 20_000 } }))) {
      expect(load.axialN).toBeCloseTo(5_000, 6)
      expect(load.shearN).toBeCloseTo(2_000, 6)
    }
  })

  it('puts the +y bolts in tension under +Mx and the −x bolts under +My', () => {
    // FA = Mx·y/Σy² = 1e6 N·mm × (±50) / 10 000 = ±5000 N
    expect(loadsFor(loadCase({ momentNm: { x: 1_000, y: 0, z: 0 } })).map((l) => l.axialN)).toEqual([-5_000, -5_000, 5_000, 5_000])
    // FA = −My·x/Σx² = −1e6 × (∓50) / 10 000
    expect(loadsFor(loadCase({ momentNm: { x: 0, y: 1_000, z: 0 } })).map((l) => l.axialN)).toEqual([5_000, -5_000, 5_000, -5_000])
  })

  it('shares a torque Mz by distance from the centroid', () => {
    // Q = Mz·r/Σr² = 5e5 N·mm × 70.711 / 20 000 = 1767.8 N, perpendicular to r
    for (const load of loadsFor(loadCase({ momentNm: { x: 0, y: 0, z: 500 } }))) {
      expect(load.shearN).toBeCloseTo(1767.77, 1)
      expect(load.shearXN * load.xMm + load.shearYN * load.yMm).toBeCloseTo(0, 6)
    }
  })

  it('moves a load at an offset load point to the centroid', () => {
    // Fy 6 kN at x +15 mm and Fz 14 kN at (15, 10) mm, 40 mm above the interface:
    //   Mx = y·Fz − z·Fy = 0.010 × 14 000 − 0.040 × 6000 = 140 − 240 = −100 N·m
    //   My = z·Fx − x·Fz = −0.015 × 14 000 = −210 N·m
    //   Mz = x·Fy − y·Fx = 0.015 × 6000 = 90 N·m
    const moved = loadAtCentroid(
      { forceN: { x: 0, y: 6_000, z: 14_000 }, momentNm: zero, loadPointMm: { x: 215, y: 110, z: 40 } }, { x: 200, y: 100 })
    expect(moved.momentNm.x).toBeCloseTo(-100, 9)
    expect(moved.momentNm.y).toBeCloseTo(-210, 9)
    expect(moved.momentNm.z).toBeCloseTo(90, 9)
  })

  it('checks every bolt with its joint and reports the governing one', () => {
    const result = expectOk(analyseBoltPattern(squareInput(loadCase({ forceN: { x: 0, y: 0, z: 20_000 }, momentNm: { x: 1_000, y: 0, z: 0 } }))))
    // The +y bolts (B3, B4) carry 5 + 5 = 10 kN, the −y bolts 0 (5 − 5); B3 is the first of the two most loaded.
    expect(result.bolts.map((b) => b.analysis.steps.find((s) => s.id === 'separation')?.check?.value.value ?? 0)).toEqual([0, 0, 10_000, 10_000].map((n) => expect.closeTo(n, 6)))
    expect(result.governing.bolt.id).toBe('B3')
    expect(result.byJointType).toEqual([expect.objectContaining({ jointTypeId: 'J1', boltCount: 4, governingBoltId: 'B3' })])
  })
})

describe('equilibrium for an asymmetric pattern with mixed joint types', () => {
  // The Bolt Pattern screen's layout and load case LC3 (Fy 6 kN, Fz 14 kN, Mx 300, My 250, Mz 400 N·m at x 15, y 10 from the centroid).
  const jointTypes = [
    { id: 'J1', name: 'M12 10.9 steel, through, Ti-6Al-4V', design: m12Through },
    { id: 'J2', name: 'M6 A4-80, tapped Ti-6Al-4V', design: {
      ...common, thread: { nominalMm: 6 }, propertyClass: 'A4-80', headType: 'socket', outerDiameterMm: 16,
      joint: { kind: 'tapped', material: ti64, engagementMm: 9 }, plates: [{ material: ti64, thicknessMm: 8 }] } },
    { id: 'J3', name: 'M4 12.9 + Helicoil, Al 7075-T6', design: {
      ...common, thread: { nominalMm: 4 }, propertyClass: '12.9', headType: 'socket', outerDiameterMm: 12,
      joint: { kind: 'insert', insert: 'helical-coil', material: al7075, engagementMm: 6 }, plates: [{ material: ti64, thicknessMm: 5 }] } },
    { id: 'J4', name: 'M4 12.9 + Keensert, Al 7075-T6', design: {
      ...common, thread: { nominalMm: 4 }, propertyClass: '12.9', headType: 'socket', outerDiameterMm: 12,
      // UNSURE: outer thread of a thin-wall M4 key-locking insert taken as M6×1 for the test; use the catalogue value.
      joint: { kind: 'insert', insert: 'key-locking', material: al7075, engagementMm: 8, outerThread: { nominalMm: 6, pitchMm: 1 } },
      plates: [{ material: ti64, thicknessMm: 5 }] } },
  ] as const
  const layout: readonly [string, number, number, string][] = [
    ['B1', -60, -40, 'J1'], ['B2', 60, -40, 'J1'], ['B3', -60, 40, 'J3'], ['B4', 60, 40, 'J4'],
    ['B5', 0, -55, 'J2'], ['B6', 0, 55, 'J2'], ['B7', -95, 0, 'J3'], ['B8', 95, 25, 'J4'], // B8 moved off-axis: asymmetric
  ]
  const bolts = layout.map(([id, xMm, yMm, jointTypeId]) => ({ id, xMm, yMm, jointTypeId }))
  const lc: PatternLoadCase = { forceN: { x: 1_500, y: 6_000, z: 14_000 }, momentNm: { x: 300, y: 250, z: 400 }, loadPointMm: { x: 15, y: 10, z: 0 } }

  it('the bolt forces balance the load at the centroid', () => {
    const properties = patternProperties(bolts)
    expect(properties.ixyMm2).not.toBe(0)
    const load = loadAtCentroid(lc, properties.centroidMm)
    const shares = expectOk(boltLoads(bolts, properties, load))
    const sum = (f: (l: (typeof shares)[number]) => number) => shares.reduce((s, l) => s + f(l), 0)
    expect(sum((l) => l.axialN)).toBeCloseTo(14_000, 6)
    expect(sum((l) => l.axialN * l.yMm) / 1000).toBeCloseTo(load.momentNm.x, 6)
    expect(-sum((l) => l.axialN * l.xMm) / 1000).toBeCloseTo(load.momentNm.y, 6)
    expect(sum((l) => l.shearXN)).toBeCloseTo(1_500, 6)
    expect(sum((l) => l.shearYN)).toBeCloseTo(6_000, 6)
    expect(sum((l) => l.xMm * l.shearYN - l.yMm * l.shearXN) / 1000).toBeCloseTo(load.momentNm.z, 6)
  })

  it('evaluates each bolt with its own joint type', () => {
    const result = expectOk(analyseBoltPattern({ jointTypes, bolts, loadCase: lc }))
    expect(result.byJointType.map((j) => [j.jointTypeId, j.boltCount])).toEqual([['J1', 2], ['J2', 2], ['J3', 2], ['J4', 2]])
    expect(result.governing.utilisation).toBe(Math.max(...result.bolts.map((b) => b.utilisation)))
    const b3 = result.bolts.find((b) => b.bolt.id === 'B3')
    expect(b3?.analysis.geometry.thread.designation).toBe('M4')
    expect(b3?.analysis.steps.find((s) => s.id === 'engagement')?.message).toMatch(/insert/)
  })
})

describe('patterns that cannot carry the load, and invalid input', () => {
  const pair = [{ id: 'A', xMm: 0, yMm: 0, jointTypeId: 'J1' }, { id: 'B', xMm: 100, yMm: 0, jointTypeId: 'J1' }]
  const pairInput = (lc: PatternLoadCase): BoltPatternInput => ({ jointTypes: [{ id: 'J1', name: 'M12', design: m12Through }], bolts: pair, loadCase: lc })

  it('a line of bolts carries a moment about the perpendicular axis but not about the line', () => {
    // My = 1000 N·m on bolts at x = ±50: FA = −My·x/Σx² = ∓1e6 × 50 / 5000 = ±10 000 N
    const ok = expectOk(analyseBoltPattern(pairInput(loadCase({ momentNm: { x: 0, y: 1_000, z: 0 } }))))
    expect(ok.bolts.map((b) => b.load.axialN)).toEqual([expect.closeTo(10_000, 6), expect.closeTo(-10_000, 6)])
    expect(expectError(analyseBoltPattern(pairInput(loadCase({ momentNm: { x: 1_000, y: 0, z: 0 } }))))).toMatch(/one line/)
  })

  it('a single bolt cannot carry a torque about the centroid', () => {
    const single = { ...pairInput(loadCase({ momentNm: { x: 0, y: 0, z: 10 } })), bolts: [pair[0]] }
    expect(expectError(analyseBoltPattern(single))).toMatch(/torque/)
    expect(analyseBoltPattern({ ...single, loadCase: loadCase({ forceN: { x: 0, y: 0, z: 5_000 } }) }).ok).toBe(true)
  })

  it.each<[string, Partial<BoltPatternInput>, RegExp]>([
    ['no bolts', { bolts: [] }, /at least one bolt/],
    ['unknown joint type', { bolts: [{ id: 'A', xMm: 0, yMm: 0, jointTypeId: 'J9' }] }, /J9/],
    ['duplicate bolt id', { bolts: [pair[0], { ...pair[1], id: 'A' }] }, /Bolt id A/],
    ['duplicate joint type id', { jointTypes: [{ id: 'J1', name: 'a', design: m12Through }, { id: 'J1', name: 'b', design: m12Through }] }, /J1/],
    ['NaN position', { bolts: [{ ...pair[0], xMm: Number.NaN }, pair[1]] }, /position/],
    ['NaN load', { loadCase: loadCase({ forceN: { x: Number.NaN, y: 0, z: 0 } }) }, /number/],
    ['invalid joint design', { jointTypes: [{ id: 'J1', name: 'M12', design: { ...m12Through, plates: [] } }] }, /J1 \(M12\): Add at least one/],
  ])('%s', (_name, change, message) => {
    const input = { ...pairInput(loadCase({ forceN: { x: 0, y: 0, z: 1_000 } })), ...change }
    expect(() => analyseBoltPattern(input)).not.toThrow()
    expect(expectError(analyseBoltPattern(input))).toMatch(message)
  })
})
