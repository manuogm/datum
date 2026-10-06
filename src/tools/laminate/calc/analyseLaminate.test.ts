import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk, relativeDifference } from '../../../core/testing'
import { analyseLaminate, type LaminateInput, type PlyMaterial, parseLayup, plyMaterial, pliesOf } from '.'

const ply = (id: string): PlyMaterial => expectOk(plyMaterial(expectOk(materialById(id))))
const t300 = ply('cfrp-t300-5208-ud')
const t700 = ply('cfrp-t700-m21-ud')

const analyse = (material: PlyMaterial, layup: string, loads: LaminateInput['loads'], criterion: LaminateInput['criterion'] = 'tsai-wu') =>
  expectOk(analyseLaminate({ plies: pliesOf(material, expectOk(parseLayup(layup))), loads, criterion }))

// Reference numbers come from an independent Python CLT script (Q̄ by
// T⁻¹·Q·R·T·R⁻¹, A⁻¹ by cofactors), not from this engine.

describe('a single UD 0° ply (T300/5208, Tsai & Hahn 1980)', () => {
  const result = analyse(t300, '[0]', { nxNPerMm: 100 })

  it('has the lamina constants as laminate constants', () => {
    expect(result.constants.exGPa).toBeCloseTo(181, 9)
    expect(result.constants.eyGPa).toBeCloseTo(10.3, 9)
    expect(result.constants.gxyGPa).toBeCloseTo(7.17, 9)
    expect(result.constants.nuXy).toBeCloseTo(0.28, 12)
  })

  it('carries σ1 = Nx/h = 800 MPa and fails when σ1 reaches Xt = 1500 MPa by all three criteria', () => {
    expect(result.plies[0].top.stressMaterialMPa[0]).toBeCloseTo(800, 9)
    expect(result.plies[0].top.stressMaterialMPa[1]).toBeCloseTo(0, 9)
    expect(result.midplaneStrain[0]).toBeCloseTo(800 / 181_000, 12)
    for (const criterion of ['max-stress', 'tsai-hill', 'tsai-wu'] as const) {
      const fpf = analyse(t300, '[0]', { nxNPerMm: 100 }, criterion).firstPlyFailure
      expect(fpf.reserveFactor).toBeCloseTo(1.875, 9)
      expect(fpf.loads.nxNPerMm).toBeCloseTo(187.5, 9)
      expect(fpf.mode).toBe('fibre-tension')
    }
  })

  it('under a moment Mx = 1 N gives σx = ±6M/h² = ±384 MPa, tension on top (z > 0)', () => {
    const bent = analyse(t300, '[0]', { mxN: 1 })
    expect(bent.plies[0].top.stressGlobalMPa[0]).toBeCloseTo(384, 6)
    expect(bent.plies[0].bottom.stressGlobalMPa[0]).toBeCloseTo(-384, 6)
    expect(bent.plies[0].top.stressGlobalMPa[1]).toBeCloseTo(0, 6)
    expect(bent.constants.flexuralExGPa).toBeCloseTo(181, 6)
  })
})

describe('cross-ply [0/90]s T300/5208, Nx = 100 N/mm', () => {
  const result = analyse(t300, '[0/90]s', { nxNPerMm: 100 })

  it('A11 = A22 = (Q11 + Q22)·h/2, Ex = Ey = 95.99 GPa, Gxy = G12', () => {
    expect(result.stiffness.aNPerMm[0][0]).toBeCloseTo(48_039.32, 1)
    expect(result.stiffness.aNPerMm[1][1]).toBeCloseTo(48_039.32, 1)
    expect(result.stiffness.aNPerMm[0][1]).toBeCloseTo(1_448.46, 1)
    expect(result.constants.exGPa).toBeCloseTo(95.9913, 4)
    expect(result.constants.eyGPa).toBeCloseTo(95.9913, 4)
    expect(result.constants.gxyGPa).toBeCloseTo(7.17, 9)
    expect(result.constants.nuXy).toBeCloseTo(0.0302, 4)
  })

  it('first-ply failure: the 90° plies by matrix tension, Tsai-Wu RF 1.867 → Nx,FPF = 186.7 N/mm', () => {
    const fpf = result.firstPlyFailure
    expect(fpf.reserveFactor).toBeCloseTo(1.867, 3)
    expect(fpf.loads.nxNPerMm).toBeCloseTo(186.7, 1)
    expect(fpf.criticalPlies).toEqual([2, 3])
    expect(fpf.mode).toBe('matrix-tension')
    expect(result.plies[1].top.stressMaterialMPa[1]).toBeCloseTo(21.374, 3)
    expect(analyse(t300, '[0/90]s', { nxNPerMm: 100 }, 'max-stress').firstPlyFailure.reserveFactor).toBeCloseTo(1.8714, 4)
    expect(analyse(t300, '[0/90]s', { nxNPerMm: 100 }, 'tsai-hill').firstPlyFailure.reserveFactor).toBeCloseTo(1.8712, 4)
  })
})

describe('quasi-isotropic [0/±45/90]s', () => {
  const result = analyse(t300, '[0/±45/90]s', { nxNPerMm: 100 })
  const { exGPa, eyGPa, gxyGPa, nuXy } = result.constants

  it('is in-plane isotropic: Ex = Ey and Gxy = Ex / (2(1 + νxy))', () => {
    expect(relativeDifference(eyGPa, exGPa)).toBeLessThan(1e-12)
    expect(relativeDifference(gxyGPa, exGPa / (2 * (1 + nuXy)))).toBeLessThan(1e-12)
    expect(exGPa).toBeCloseTo(69.6757, 4)
    expect(nuXy).toBeCloseTo(0.296, 3)
  })

  it('has no B, A16, A26 coupling, but D16, D26 ≠ 0 (the ±45 plies are not at the same z)', () => {
    expect(result.coupling).toEqual({ bendingExtension: false, shearExtension: false, bendTwist: true })
    expect(result.constants.apparent).toBe(false)
    expect(result.layup).toMatchObject({ notation: '[0/±45/90]s', plyCount: 8, symmetric: true, balanced: true })
    expect(result.layup.thicknessMm).toBeCloseTo(1, 12)
    expect(result.layup.arealMassKgPerM2).toBeCloseTo(1.6, 12)
  })
})

describe('the design screen case: T700/M21 [0/±45/90]s, Nx 250, Nxy 80 N/mm, Tsai-Wu', () => {
  const result = analyse(t700, '[0/±45/90]s', { nxNPerMm: 250, nxyNPerMm: 80 })

  it('stiffness: Ex = Ey = 51.69, Gxy = 19.69 GPa, νxy = 0.313', () => {
    expect(result.constants.exGPa).toBeCloseTo(51.6902, 4)
    expect(result.constants.eyGPa).toBeCloseTo(51.6902, 4)
    expect(result.constants.gxyGPa).toBeCloseTo(19.6871, 4)
    expect(result.constants.nuXy).toBeCloseTo(0.3128, 4)
    expect(result.midplaneStrain[0]).toBeCloseTo(0.0048365, 7)
  })

  it('ply stresses in ply axes match the hand values', () => {
    const [s1, s2, t12] = result.plies[3].top.stressMaterialMPa
    expect(s1).toBeCloseTo(-191.895, 3)
    expect(s2).toBeCloseTo(38.558, 3)
    expect(t12).toBeCloseTo(-18.692, 3)
    expect(result.plies[0].top.stressMaterialMPa[0]).toBeCloseTo(653.027, 3)
    expect(result.plies[2].top.stressMaterialMPa[0]).toBeCloseTo(-39.809, 3)
  })

  it('RF 1.267 below the 1.5 target, plies 4–5 (90°) critical; Nx,FPF = 316.8 N/mm', () => {
    const fpf = result.firstPlyFailure
    expect(fpf.reserveFactor).toBeCloseTo(1.2673, 4)
    expect(fpf.criticalPlies).toEqual([4, 5])
    expect(fpf.status).toBe('warn')
    expect(fpf.targetReserveFactor).toBe(1.5)
    expect(fpf.loads.nxNPerMm).toBeCloseTo(316.8, 1)
    expect(fpf.loads.nxyNPerMm).toBeCloseTo(101.4, 1)
    expect(fpf.loads.nyNPerMm).toBe(0)
    expect(result.plies.map((p) => p.failureIndex.toFixed(3))).toEqual(['0.320', '0.362', '0.667', '0.789', '0.789', '0.667', '0.362', '0.320'])
  })
})

describe('unsymmetric and unbalanced laminates', () => {
  it('[0/90] has B11 = (Q11 − Q22)·t²/2 and apparent constants', () => {
    const result = analyse(t300, '[0/90]', { nxNPerMm: 10 })
    expect(result.stiffness.bN[0][0]).toBeCloseTo((181_811.14 - 10_346.16) * 0.125 ** 2 / 2, 1)
    expect(result.coupling.bendingExtension).toBe(true)
    expect(result.constants.apparent).toBe(true)
    expect(result.curvaturePerMm[0]).not.toBeCloseTo(0, 6)
    expect(result.layup.symmetric).toBe(false)
  })

  it('[45]s is symmetric but unbalanced: A16 ≠ 0 and D16 ≠ 0', () => {
    const result = analyse(t300, '[45]s', { nxNPerMm: 10 })
    expect(result.coupling).toEqual({ bendingExtension: false, shearExtension: true, bendTwist: true })
    expect(result.layup.balanced).toBe(false)
    expect(result.midplaneStrain[2]).not.toBeCloseTo(0, 6)
  })

  it('with no load every reserve factor is infinite and no ply is critical', () => {
    const fpf = analyse(t300, '[0/90]s', {}).firstPlyFailure
    expect(fpf.reserveFactor).toBe(Infinity)
    expect(fpf.criticalPlies).toEqual([])
    expect(fpf.status).toBe('pass')
  })
})

describe('invalid input gives an explanation, never an exception', () => {
  const valid: LaminateInput = { plies: pliesOf(t700, [0, 90, 90, 0]), loads: { nxNPerMm: 100 }, criterion: 'tsai-wu' }

  it.each<[string, Partial<LaminateInput>, RegExp]>([
    ['no plies', { plies: [] }, /at least one ply/],
    ['NaN angle', { plies: pliesOf(t700, [Number.NaN]) }, /angle/],
    ['zero thickness', { plies: pliesOf(t700, [0], 0) }, /thickness/],
    ['no lamina data', { plies: [{ material: { ...t700, lamina: undefined as never }, angleDeg: 0 }] }, /lamina/],
    ['ν12 too large', { plies: pliesOf({ ...t700, lamina: { ...t700.lamina, nu12: 5 } }, [0]) }, /ν12/],
    ['zero strength', { plies: pliesOf({ ...t700, lamina: { ...t700.lamina, ytMPa: 0 } }, [0]) }, /strengths/],
    ['NaN load', { loads: { nxNPerMm: Number.NaN } }, /load/],
    ['unknown criterion', { criterion: 'hashin' as never }, /criterion/],
    ['target of 0', { targetReserveFactor: 0 }, /target/],
    ['F12* of −1', { tsaiWuF12Star: -1 }, /F12\*/],
  ])('%s', (_, change, message) => {
    expect(expectError(analyseLaminate({ ...valid, ...change }))).toMatch(message)
  })

  it('accepts the valid base case', () => {
    expect(analyseLaminate(valid).ok).toBe(true)
  })
})
