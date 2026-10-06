import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectOk, relativeDifference } from '../../../core/testing'
import { maxStress, minorPoissonRatio, plyMaterial, reducedStiffnessMPa, strainToMaterialAxes, transformedStiffnessMPa, tsaiHill, tsaiWu } from '.'

const t300 = expectOk(plyMaterial(expectOk(materialById('cfrp-t300-5208-ud')))).lamina
const t700 = expectOk(plyMaterial(expectOk(materialById('cfrp-t700-m21-ud')))).lamina

describe('reduced stiffness Q of T300/5208 (Tsai & Hahn 1980: Q11 181.8, Q22 10.35, Q12 2.897, Q66 7.17 GPa)', () => {
  const q = reducedStiffnessMPa(t300)

  it('matches the textbook values', () => {
    expect(minorPoissonRatio(t300)).toBeCloseTo(0.28 * 10.3 / 181, 12)
    expect(relativeDifference(q[0][0], 181_811)).toBeLessThan(1e-5)
    expect(relativeDifference(q[1][1], 10_346)).toBeLessThan(1e-4)
    expect(relativeDifference(q[0][1], 2_896.9)).toBeLessThan(1e-4)
    expect(q[2][2]).toBe(7_170)
  })

  it('Q̄(0°) = Q, Q̄(90°) swaps the 1 and 2 directions', () => {
    const q0 = transformedStiffnessMPa(q, 0)
    const q90 = transformedStiffnessMPa(q, 90)
    expect(q0[0][0]).toBeCloseTo(q[0][0], 6)
    expect(q90[0][0]).toBeCloseTo(q[1][1], 6)
    expect(q90[1][1]).toBeCloseTo(q[0][0], 6)
    expect(q90[0][2]).toBeCloseTo(0, 6)
  })

  it('Q̄(±45°): hand values from T⁻¹·Q·R·T·R⁻¹ (independent route)', () => {
    const q45 = transformedStiffnessMPa(q, 45)
    expect(q45[0][0]).toBeCloseTo(56_657.79, 1)
    expect(q45[0][1]).toBeCloseTo(42_317.79, 1)
    expect(q45[0][2]).toBeCloseTo(42_866.25, 1)
    expect(q45[2][2]).toBeCloseTo(46_590.86, 1)
    expect(transformedStiffnessMPa(q, -45)[0][2]).toBeCloseTo(-42_866.25, 1)
  })

  it('rotates strains into ply axes: pure εx at 45° gives ε1 = ε2 = εx/2, γ12 = −εx', () => {
    const [e1, e2, g12] = strainToMaterialAxes([0.002, 0, 0], 45)
    expect(e1).toBeCloseTo(0.001, 12)
    expect(e2).toBeCloseTo(0.001, 12)
    expect(g12).toBeCloseTo(-0.002, 12)
  })
})

describe('failure criteria reach failure exactly at a single stress equal to its strength', () => {
  it.each<[string, readonly [number, number, number]]>([
    ['σ1 = Xt', [t700.xtMPa, 0, 0]],
    ['σ1 = −Xc', [-t700.xcMPa, 0, 0]],
    ['σ2 = Yt', [0, t700.ytMPa, 0]],
    ['σ2 = −Yc', [0, -t700.ycMPa, 0]],
    ['τ12 = S', [0, 0, t700.sMPa]],
  ])('%s', (_, stress) => {
    expect(maxStress(stress, t700).reserveFactor).toBeCloseTo(1, 12)
    expect(tsaiHill(stress, t700)).toBeCloseTo(1, 12)
    expect(tsaiWu(stress, t700, -0.5)).toBeCloseTo(1, 12)
  })

  it('names the max-stress mode and gives Infinity with no stress', () => {
    expect(maxStress([-100, 30, 10], t700).mode).toBe('matrix-tension')
    expect(maxStress([-1200, 30, 10], t700).mode).toBe('fibre-compression')
    expect(maxStress([0, 0, 0], t700)).toEqual({ reserveFactor: Infinity, mode: 'none' })
    expect(tsaiWu([0, 0, 0], t700, -0.5)).toBe(Infinity)
    expect(tsaiHill([0, 0, 0], t700)).toBe(Infinity)
  })

  it('Tsai-Wu strength ratio is the positive root of a·R² + b·R = 1 (hand: σ = (−191.895, 38.558, −18.692) → R = 1.2673)', () => {
    // 90° ply of the design laminate [0/±45/90]s T700/M21 under Nx 250, Nxy 80 N/mm.
    expect(tsaiWu([-191.895, 38.558, -18.692], t700, -0.5)).toBeCloseTo(1.2673, 3)
    expect(tsaiHill([-191.895, 38.558, -18.692], t700)).toBeCloseTo(1.4466, 3)
    expect(maxStress([-191.895, 38.558, -18.692], t700).reserveFactor).toBeCloseTo(1.5561, 3)
  })
})
