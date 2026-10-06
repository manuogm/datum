import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectOk, relativeDifference } from '../../../core/testing'
import { analyseBoltedJoint, type BoltedJointAnalysis, type BoltedJointInput, type StepId } from '.'

const al7075 = expectOk(materialById('al-7075-t6')) // E 71.7 GPa, α 23.4, Rm 572 MPa
const s355 = expectOk(materialById('steel-s355')) // E 210 GPa, α 12
const steel42CrMo4 = expectOk(materialById('steel-42crmo4-qt')) // E 210 GPa, Rm 1100 MPa

const analyse = (input: BoltedJointInput) => expectOk(analyseBoltedJoint(input))
const stepOf = (analysis: BoltedJointAnalysis, id: StepId) => {
  const found = analysis.steps.find((s) => s.id === id)
  if (!found) throw new Error(`No step ${id}`)
  return found
}
const sfOf = (analysis: BoltedJointAnalysis, id: StepId) => stepOf(analysis, id).check?.safetyFactor ?? Number.NaN

/**
 * The hand values below were worked through on paper (and in a separate
 * script) with the VDI 2230-1 formulas, rounded to 5 significant figures.
 * Tolerance: 0.05 % relative, which covers that rounding; the engine and the
 * hand calculation use the same formulas, so any real error is far larger.
 */
const TOLERANCE = 5e-4
const expectNear = (actual: number, expected: number) =>
  expect(relativeDifference(actual, expected), `${actual} vs ${expected}`).toBeLessThan(TOLERANCE)

/**
 * Worked example A, following the method of VDI 2230-1 Annex B (not one of
 * its examples): the Bolted Joint screen's case. M10 10.9 hexagon head bolt
 * with ISO 4032 nut (through-bolted, DSV) clamping 12 mm Al 7075-T6 (head
 * side) and 8 mm S355, DA = 30 mm, torque wrench (αA 1.6), µG = µK = 0.12,
 * µT = 0.15, Rz 10 … 40, n = 0.5, FA 0 … 12 kN, FQ 2 kN alternating,
 * service −40 … 120 °C.
 */
const exampleA: BoltedJointInput = {
  thread: { nominalMm: 10 },
  propertyClass: '10.9',
  headType: 'hex',
  washers: false,
  joint: { kind: 'through-bolt' },
  plates: [{ material: al7075, thicknessMm: 12 }, { material: s355, thicknessMm: 8 }],
  outerDiameterMm: 30,
  tightening: { method: 'torque-wrench' },
  threadFriction: 0.12,
  headFriction: 0.12,
  interfaceFriction: 0.15,
  surfaceRoughness: 'rz-10-to-40',
  loadIntroduction: { position: 'middle' },
  serviceTempC: { minC: -40, maxC: 120 },
  loads: { axialMaxN: 12_000, transverseN: 2_000 },
}

describe('worked example A: M10 10.9 through-bolt, Al 7075-T6 + S355', () => {
  const a = analyse(exampleA)

  it('R0: geometry', () => {
    // d2 = 9.0257, d3 = 8.1597, ds = 8.5927, As = π/4·ds² = 57.990 mm², Ad3 = 52.292 mm²
    // dW = 14.63 (ISO 4014/4032 dw min), dh = 11 (ISO 273 medium), lK = 12 + 8 = 20 mm
    expectNear(a.geometry.thread.stressAreaMm2, 57.990)
    expect([a.geometry.headBearingMm, a.geometry.nutBearingMm, a.geometry.clearanceHoleMm, a.geometry.clampLengthMm]).toEqual([14.63, 14.63, 11, 20])
  })

  it('R3: resiliences and load factor', () => {
    // δS, ES = 205 000 MPa, AN = 78.540, Ad3 = 52.292 mm²:
    //   head     0.5·d = 5 mm / (ES·AN)   = 3.1055e-7
    //   thread   lK = 20 mm / (ES·Ad3)    = 1.8657e-6 (fully threaded)
    //   engaged  0.5·d = 5 mm / (ES·Ad3)  = 4.6642e-7
    //   nut      0.4·d = 4 mm / (ES·AN)   = 2.4844e-7
    //   δS = 2.8911e-6 mm/N
    expectNear(a.resilience.boltMmPerN, 2.8911e-6)
    // Cone (DSV): βL = 20/14.63, y = 30/14.63 → tan φ = 0.45970 (φ = 24.69°), DA,Gr = 14.63 + 20·0.4597 = 23.824 < DA: full cone.
    expectNear(a.resilience.coneTanPhi, 0.45970)
    expectNear(a.resilience.coneLimitDiameterMm, 23.824)
    // Cones from head and nut meet at 10 mm. D(z) = dW + 2·z·tan φ, ln-term per §5.1.2.2:
    //   Al: head cone z 0…10 plus nut cone distance 8…10 → 9.2716e-7 (E 71 700)
    //   S355: nut cone distance 0…8                     → 2.5630e-7 (E 210 000)
    //   δP = 1.1835e-6 mm/N
    expectNear(a.resilience.plateShareMmPerN[0], 9.2716e-7)
    expectNear(a.resilience.plateShareMmPerN[1], 2.5630e-7)
    expectNear(a.resilience.platesMmPerN, 1.1835e-6)
    // ΦK = δP/(δS + δP) = 0.29045, Φn = 0.5 × 0.29045 = 0.14523
    expectNear(a.loadFactor, 0.14523)
  })

  it('R4: embedding and thermal preload change', () => {
    // Table 5, Rz 10…40, transverse load: thread 3 + 2 bearings × 4.5 + 1 interface × 2.5 = 14.5 µm
    // FZ = 14.5e-3 / (δS + δP) = 3558.7 N
    expect(a.preload.embeddingUm).toBe(14.5)
    expectNear(a.preload.embeddingLossN, 3558.7)
    // ΔFVth = (αS·lK − Σα·l)·ΔT / (δS + δP) = (11.5·20 − (23.4·12 + 12·8))e-6 · ΔT / 4.0746e-6
    //   = −146.8e-6·ΔT / 4.0746e-6: at −40 °C (ΔT = −60) +2161.7 N loss; at 120 °C (ΔT = 100) 3602.9 N gain
    expectNear(a.preload.thermalLossN, 2161.7)
    expectNear(a.preload.thermalGainN, 3602.9)
  })

  it('R5 … R7: preload', () => {
    // R7: [3/2 · d2/d0 · (P/(π·d2) + 1.155·0.12)] = 0.30173 → √(1 + 3·0.30173²) = 1.12833
    //     FMzul = 0.9 × 940 / 1.12833 × 57.990 = 43 479.7 N
    expectNear(a.preload.assemblyMaxN, 43_479.7)
    // R6: FMmin = 43 479.7 / 1.6 = 27 174.8 N
    expectNear(a.preload.assemblyMinN, 27_174.8)
    // R2: FKQerf = 2000 / (1 × 0.15) = 13 333.3 N
    // R5: FMerf = 13 333.3 + (1 − 0.14523)·12 000 + 3558.7 + 2161.7 = 29 311.0 N → SF = 27 174.8 / 29 311.0 = 0.9271
    expectNear(a.preload.requiredAssemblyMinN, 29_311.0)
    expectNear(sfOf(a, 'minimum-preload'), 0.9271)
    expect(stepOf(a, 'minimum-preload').status).toBe('fail')
  })

  it('separation and slip (R12)', () => {
    // FV,min = 27 174.8 − 3558.7 − 2161.7 = 21 454.4 N; FA,sep = 21 454.4 / (1 − 0.14523) = 25 099.5 N; SK = 2.0916
    expectNear(a.preload.serviceMinN, 21_454.4)
    expectNear(a.preload.separationAxialN, 25_099.5)
    expectNear(sfOf(a, 'separation'), 2.0916)
    // FKR,min = 21 454.4 − 0.85477 × 12 000 = 11 197.1 N; SG = 11 197.1 / 13 333.3 = 0.8398 < 1: slips
    expectNear(a.preload.residualClampMinN, 11_197.1)
    expectNear(sfOf(a, 'slip'), 0.8398)
    expect(stepOf(a, 'slip').status).toBe('fail')
  })

  it('R8 … R10: working stress, fatigue, surface pressure', () => {
    // FSmax = 43 479.7 + 0.14523 × 12 000 + 3602.9 (thermal gain) = 48 825.3 N
    // σz = 841.97, kτ·τ = 0.5 · MG/WP = 150.82, σred,B = 881.56 MPa → SF = 940/881.56 = 1.0663
    expectNear(a.preload.boltForceMaxN, 48_825.3)
    expectNear(sfOf(a, 'working-stress'), 1.0663)
    // σa = 0.14523 × 12 000 / (2 × 57.990) = 15.026 MPa; σASV = 0.85·(150/10 + 45) = 51.0 MPa; SD = 3.3941
    expectNear(sfOf(a, 'alternating-stress'), 3.3941)
    // Ap = π/4·(14.63² − 11²) = 73.071 mm²; p = 48 825.3 / 73.071 = 668.19 MPa
    // Head side on Al 7075 (pG 410, UNSURE table value): SP = 0.6136 — crushed; nut side on S355 (pG 760): 1.137
    expectNear(sfOf(a, 'surface-pressure'), 0.6136)
    expect(stepOf(a, 'surface-pressure').message).toMatch(/head.*Al 7075-T6/)
  })

  it('R13: tightening torque', () => {
    // DKm = (14.63 + 11)/2 = 12.815; MA = 43 479.7 × (0.16·1.5 + 0.58·9.0257·0.12 + 6.4075·0.12) / 1000 = 71.180 N·m
    expectNear(a.preload.tighteningTorqueNm, 71.180)
  })

  it('summarises: fails, governed by slip', () => {
    // Checks: R5, separation, R7, R8, R9, R10, R12 (R11 does not apply to a through-bolt with nut).
    // Utilisations (required / actual safety factor): R12 1.8/0.8398 = 2.14, R10 1/0.6136 = 1.63, R5 1/0.9271 = 1.08.
    expect(a.summary).toMatchObject({ status: 'fail', checksTotal: 7, checksPassed: 4, governing: 'slip' })
    expectNear(a.summary.utilisation, 1.8 / 0.8398)
    expect(a.steps.map((s) => s.rStep)).toEqual(['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13'])
  })
})

/**
 * Worked example B: tapped thread joint (ESV) with cone and sleeve.
 * M12 12.9 socket head (dW 17.23, dh 13.5) screwed 15 mm into 42CrMo4,
 * clamping 20 mm S355, DA = 36 mm, calibrated torque wrench (αA 1.4),
 * µG = µK = 0.10, µT = 0.2, Rz < 10, n = 0.7 (near head), FA 5 … 15 kN,
 * FQ 3 kN static.
 */
const exampleB: BoltedJointInput = {
  ...exampleA,
  thread: { nominalMm: 12 },
  propertyClass: '12.9',
  headType: 'socket',
  joint: { kind: 'tapped', material: steel42CrMo4, engagementMm: 15 },
  plates: [{ material: s355, thicknessMm: 20 }],
  outerDiameterMm: 36,
  tightening: { method: 'torque-wrench-calibrated' },
  threadFriction: 0.1,
  headFriction: 0.1,
  interfaceFriction: 0.2,
  surfaceRoughness: 'rz-below-10',
  loadIntroduction: { position: 'near-head' },
  serviceTempC: undefined,
  loads: { axialMaxN: 15_000, axialMinN: 5_000, transverseN: 3_000, transverseVariation: 'static' },
}

describe('worked example B: M12 12.9 socket head into tapped 42CrMo4', () => {
  const b = analyse(exampleB)

  it('R3: tapped-thread resilience and a cone that turns into a sleeve', () => {
    // δS: head 0.4·d (socket), free thread 20, engaged 0.5·d, tapped thread 0.33·d on AN with E(42CrMo4) = 210 000 → 2.0372e-6
    expectNear(b.resilience.boltMmPerN, 2.0372e-6)
    // ESV: tan φ = 0.49215, DA,Gr = 17.23 + 2·20·0.49215 = 36.916 > DA = 36 → cone + sleeve (closed form, §5.1.2.2): δP = 3.0629e-7
    expectNear(b.resilience.coneLimitDiameterMm, 36.916)
    expectNear(b.resilience.platesMmPerN, 3.0629e-7)
    // Φn = 0.7 × 3.0629e-7 / (2.0372e-6 + 3.0629e-7) = 0.091491
    expectNear(b.loadFactor, 0.091491)
  })

  it('preload, checks and torque', () => {
    // FMzul = 75 949.5 N (Rp0.2 1100, µG 0.10); FMmin = 54 249.7 N
    expectNear(b.preload.assemblyMaxN, 75_949.5)
    // fZ = 3 + 3 + 2 = 8 µm (Rz < 10, transverse: thread, head, one interface to the tapped part); FZ = 3413.8 N
    expectNear(b.preload.embeddingLossN, 3413.8)
    // FMerf = 15 000 + (1 − 0.091491)·15 000 + 3413.8 = 32 041.4 → SF 1.6931
    expectNear(sfOf(b, 'minimum-preload'), 1.6931)
    // SG = (54 249.7 − 3413.8 − 0.908509 × 15 000) / 15 000 = 2.4806 ≥ 1.2 (static)
    expectNear(sfOf(b, 'slip'), 2.4806)
    // σred,B = 957.35 MPa → SF 1.1490;  σa = 0.091491 × 10 000 / (2 × 84.267) = 5.4287, σASV = 48.875 → SD 9.0031
    expectNear(sfOf(b, 'working-stress'), 1.1490)
    expectNear(sfOf(b, 'alternating-stress'), 9.0031)
    // p = 77 321.9 / 90.025 = 858.90 MPa on S355 (pG 760) → SP 0.8849: a 12.9 socket head needs a hardened washer on S355
    expectNear(sfOf(b, 'surface-pressure'), 0.8849)
    // MA = 75 949.5 × (0.16·1.75 + 0.58·10.8633·0.1 + 15.365/2·0.1) / 1000 = 127.47 N·m
    expectNear(b.preload.tighteningTorqueNm, 127.47)
  })

  it('R11: engagement in the tapped hole', () => {
    // FmS = 1220 × 84.267 = 102 806 N
    // tapped thread: τB = 0.6 × 1100 = 660 MPa, area 0.875·π·12 per mm → 4.7221 mm
    // bolt thread:   τB = 0.6 × 1220 = 732 MPa, area 0.75·π·D1 (10.1056) per mm → 5.8984 mm (governs)
    const step = stepOf(b, 'engagement')
    expectNear(step.check?.value.value ?? 0, 5.8984)
    expectNear(step.check?.safetyFactor ?? 0, 15 / 5.8984)
    expect(step.message).toMatch(/bolt thread/)
  })
})

describe('thread inserts', () => {
  const insertJoint = (insert: BoltedJointInput['joint']): BoltedJointInput => ({
    ...exampleA,
    thread: { nominalMm: 4 },
    propertyClass: '12.9',
    headType: 'socket',
    joint: insert,
    plates: [{ material: al7075, thicknessMm: 5 }],
    outerDiameterMm: 12,
    serviceTempC: undefined,
    loads: { axialMaxN: 2_000 },
  })

  it('checks the STI outer thread of a helical-coil insert in the parent', () => {
    const a = analyse(insertJoint({ kind: 'insert', insert: 'helical-coil', material: al7075, engagementMm: 6 }))
    // STI: D = 4 + 1.299038 × 0.7 = 4.9093 mm. FmS = 1220 × 8.7787 = 10 710 N.
    // Outer thread in Al 7075: τB = 0.7 × 572 = 400.4 MPa, area 0.875·π·4.9093 per mm → 1.9821 mm (governs over 1.9152 for the bolt thread)
    const step = stepOf(a, 'engagement')
    expectNear(step.check?.value.value ?? 0, 1.9821)
    expect(step.message).toMatch(/insert outer thread \(M4.91×0.7\)/)
    // Two threads embed (bolt in insert, insert in parent): 2 × 3 + 1 × 3 (head) + 1 × 2 (interface) = 11 µm (Rz 10…40, axial load)
    expect(a.preload.embeddingUm).toBe(11)
  })

  it('uses the given outer thread of a key-locking insert', () => {
    const a = analyse(insertJoint({ kind: 'insert', insert: 'key-locking', material: al7075, engagementMm: 8, outerThread: { nominalMm: 6, pitchMm: 1 } }))
    // FmS / (400.4 × 0.875·π·6) = 10 710 / 6603.7 = 1.6218 mm < bolt thread 1.9152 mm: the bolt thread governs
    expectNear(stepOf(a, 'engagement').check?.value.value ?? 0, 1.9152)
  })
})

describe('behaviour', () => {
  it('aluminium parts on a steel bolt gain preload when hot and lose it when cold', () => {
    const hot = analyse({ ...exampleA, serviceTempC: { minC: 20, maxC: 120 } }).preload
    const cold = analyse({ ...exampleA, serviceTempC: { minC: -40, maxC: 20 } }).preload
    expect(hot.thermalLossN).toBe(0)
    expect(hot.thermalGainN).toBeGreaterThan(0)
    expect(cold.thermalGainN).toBe(0)
    expect(cold.thermalLossN).toBeGreaterThan(0)
  })

  it('washers add to the clamp length and spread the pressure on the part below', () => {
    const plain = analyse(exampleA)
    const washed = analyse({ ...exampleA, washers: true })
    // ISO 7089 M10: 2 mm thick, under head and nut → lK = 24 mm
    expect(washed.geometry.clampLengthMm).toBe(24)
    // bearing on Al: min(20, 14.63 + 2·2) = 18.63 mm instead of 14.63 → the pressure drops
    expect(sfOf(washed, 'surface-pressure')).toBeGreaterThan(sfOf(plain, 'surface-pressure'))
  })

  it('reports no slip, separation or fatigue check when there is no such load', () => {
    const a = analyse({ ...exampleA, serviceTempC: undefined, loads: { axialMaxN: 0 } })
    for (const id of ['slip', 'separation', 'alternating-stress'] as const) {
      expect(stepOf(a, id)).toMatchObject({ status: 'info', check: null })
    }
  })

  it('warns that the fatigue limit is an estimate for stainless bolts', () => {
    const a = analyse({ ...exampleA, propertyClass: 'A4-80', loads: { axialMaxN: 2_000 } })
    const step = stepOf(a, 'alternating-stress')
    expect(step.status).toBe('warn')
    expect(step.message).toMatch(/stainless/)
  })

  it('caps a surface-pressure check that relies on an estimated pG at warn', () => {
    // Ti-5553 is not in the pG table: pG is estimated as Rm.
    const ti5553 = expectOk(materialById('ti-5553'))
    const a = analyse({ ...exampleA, plates: [{ material: ti5553, thicknessMm: 12 }, { material: ti5553, thicknessMm: 8 }] })
    expect(stepOf(a, 'surface-pressure').status).toBe('warn')
    expect(stepOf(a, 'surface-pressure').message).toMatch(/estimated/)
  })

  it('does not estimate pG for a polymer: it creeps far below its tensile strength', () => {
    const pa66 = expectOk(materialById('pa66-gf30')) // Rm 190 MPa, not in the pG table
    const a = analyse({ ...exampleA, plates: [{ material: s355, thicknessMm: 12 }, { material: pa66, thicknessMm: 8 }] })
    const step = stepOf(a, 'surface-pressure')
    expect(step).toMatchObject({ status: 'warn', check: null })
    expect(step.message).toMatch(/PA66-GF30: enter it/)
    expect(analyse({ ...exampleA, plates: [{ material: s355, thicknessMm: 12 }, { material: { ...pa66, limitingSurfacePressureMPa: 40 }, thicknessMm: 8 }] })
      .bearingPressures[1].limit).toEqual({ valueMPa: 40, source: 'input' })
  })

  it('warns when the utilisation ν is above 90 %', () => {
    expect(stepOf(analyse({ ...exampleA, utilisation: 0.95 }), 'assembly-stress').status).toBe('warn')
  })

  it('makes a check with no capacity left govern with infinite utilisation', () => {
    // FA 40 kN opens the joint (FA,sep 25.1 kN): FKR,min < 0, so SG < 0 and slip cannot be resisted at all.
    const a = analyse({ ...exampleA, loads: { axialMaxN: 40_000, transverseN: 2_000 } })
    const slip = stepOf(a, 'slip')
    expect(slip.check?.safetyFactor).toBeLessThan(0)
    expect(slip.check?.utilisation).toBe(Number.POSITIVE_INFINITY)
    expect(slip.status).toBe('fail')
    expect(a.summary.utilisation).toBe(Number.POSITIVE_INFINITY)
    expect(['slip', 'separation']).toContain(a.summary.governing)
  })

  it('ends the preload-change step with the total loss R5 adds', () => {
    const a = analyse(exampleA)
    // FZ + ΔFVth = 3558.7 + 2161.7 = 5720.4 N
    expectNear(stepOf(a, 'preload-changes').values.at(-1)?.value ?? 0, 5720.4)
  })

  it('writes the messages in imperial units on request', () => {
    const a = analyse({ ...exampleA, unitSystem: 'imperial' })
    expect(stepOf(a, 'tightening-torque').message).toMatch(/lbf·ft/)
    expect(stepOf(a, 'minimum-preload').message).toMatch(/lbf/)
    expect(a.preload.tighteningTorqueNm).toBeCloseTo(71.18, 2) // numbers stay SI
  })
})
