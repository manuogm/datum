import { describe, expect, it } from 'vitest'
import { relativeDifference } from '../../fits/calc/testHelpers'
import { coneResilience, coneTanPhi } from './resilience'

/**
 * The cone integrator against the closed forms of VDI 2230-1:2015 §5.1.2.2
 * for one material, written out here independently:
 * - cone only (DA ≥ DA,Gr):
 *   δP = 2·ln[(dW + dh)(dW + w·lK·tan φ − dh) / ((dW − dh)(dW + w·lK·tan φ + dh))] / (w·E·π·dh·tan φ)
 * - cone and sleeve (dW < DA < DA,Gr):
 *   δP = { 2/(w·dh·tan φ) · ln[(dW + dh)(DA − dh) / ((dW − dh)(DA + dh))] + 4/(DA² − dh²) · [lK − (DA − dW)/(w·tan φ)] } / (E·π)
 * - sleeve only (DA ≤ dW): δP = 4·lK / (E·π·(DA² − dh²))
 * The integrator is exact, so they agree to floating-point precision (1e-9).
 */
const E = 210_000
const dW = 14.63
const dh = 11
const lK = 20

function closedForm(kind: 'through' | 'tapped', dA: number): number {
  const w = kind === 'through' ? 1 : 2
  const t = coneTanPhi(kind, lK, dW, dA)
  const dAGr = dW + w * lK * t
  if (dA <= dW) return (4 * lK) / (E * Math.PI * (dA ** 2 - dh ** 2))
  if (dA >= dAGr) {
    return 2 * Math.log(((dW + dh) * (dAGr - dh)) / ((dW - dh) * (dAGr + dh))) / (w * E * Math.PI * dh * t)
  }
  return (2 / (w * dh * t) * Math.log(((dW + dh) * (dA - dh)) / ((dW - dh) * (dA + dh)))
    + (4 / (dA ** 2 - dh ** 2)) * (lK - (dA - dW) / (w * t))) / (E * Math.PI)
}

const single = (kind: 'through' | 'tapped', dA: number) =>
  coneResilience({ layers: [{ thicknessMm: lK, modulusMPa: E }], bearingMm: dW, holeMm: dh, outerMm: dA, kind })

describe('substitute deformation cone, one material', () => {
  it.each([
    ['through', 40], ['through', 20], ['through', 14],
    ['tapped', 60], ['tapped', 25], ['tapped', 13],
  ] as const)('%s, DA = %d mm matches the VDI closed form', (kind, dA) => {
    expect(relativeDifference(single(kind, dA).totalMmPerN, closedForm(kind, dA))).toBeLessThan(1e-9)
  })

  it('does not depend on how the stack is split into layers of the same material', () => {
    const split = coneResilience({
      layers: [{ thicknessMm: 3, modulusMPa: E }, { thicknessMm: 12, modulusMPa: E }, { thicknessMm: 5, modulusMPa: E }],
      bearingMm: dW, holeMm: dh, outerMm: 20, kind: 'through',
    })
    expect(relativeDifference(split.totalMmPerN, single('through', 20).totalMmPerN)).toBeLessThan(1e-9)
  })

  it('gives tan φ per VDI 2230 eq. for DSV and ESV', () => {
    // DSV: 0.362 + 0.032·ln(20/14.63/2) + 0.153·ln(30/14.63) = 0.362 − 0.01218 + 0.10988 = 0.45970
    expect(coneTanPhi('through', 20, 14.63, 30)).toBeCloseTo(0.4597, 4)
    // ESV: 0.348 + 0.013·ln(20/17.23) + 0.193·ln(36/17.23) = 0.348 + 0.00194 + 0.14221 = 0.49215
    expect(coneTanPhi('tapped', 20, 17.23, 36)).toBeCloseTo(0.49215, 4)
  })
})
