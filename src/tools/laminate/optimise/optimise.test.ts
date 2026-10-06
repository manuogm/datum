import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk } from '../../../core/testing'
import { analyseLaminate, isBalanced, isSymmetric, parseLayup, plyMaterial, pliesOf, type PlyMaterial } from '../calc'
import { MAX_CONSECUTIVE_PLIES, MIN_SHARE_PERCENT, optimiseLayup, type LayupCandidate, type LayupOptimisation, type OptimiseInput } from '.'

const t700 = expectOk(plyMaterial(expectOk(materialById('cfrp-t700-m21-ud'))))

const designCase: OptimiseInput = { material: t700, loads: { nxNPerMm: 250, nxyNPerMm: 80 }, criterion: 'tsai-wu' }

/** Longest run of one angle in the full stack. */
function longestRun(angles: readonly number[]): number {
  let longest = 0
  let run = 0
  angles.forEach((angle, i) => {
    run = i > 0 && angles[i - 1] === angle ? run + 1 : 1
    longest = Math.max(longest, run)
  })
  return longest
}

function expectRuleCompliant(candidate: LayupCandidate, material: PlyMaterial, angleSet: readonly number[]) {
  const plies = pliesOf(material, candidate.anglesDeg)
  expect(isSymmetric(plies)).toBe(true)
  expect(isBalanced(plies)).toBe(true)
  expect(candidate.plyCount % 2).toBe(0)
  for (const angle of angleSet) {
    const share = candidate.anglesDeg.filter((a) => a === angle).length / candidate.plyCount
    expect(share).toBeGreaterThanOrEqual(MIN_SHARE_PERCENT / 100)
  }
  expect(longestRun(candidate.anglesDeg)).toBeLessThanOrEqual(MAX_CONSECUTIVE_PLIES)
  expect([45, -45]).toContain(candidate.anglesDeg[0])
  expect(expectOk(parseLayup(candidate.notation))).toEqual(candidate.anglesDeg)
}

function bestOf(result: LayupOptimisation): LayupCandidate {
  if (!result.best) throw new Error('Expected a laminate that reaches the target')
  return result.best
}

describe('optimiseLayup, in-plane loads (the design screen case: Nx 250, Nxy 80 N/mm, Tsai-Wu, target 1.5)', () => {
  const result = expectOk(optimiseLayup(designCase))

  it('8 plies cannot reach RF 1.5: the only compliant 8-ply mix is [0/±45/90]s, RF 1.267', () => {
    const eightPly = expectOk(analyseLaminate({ ...designCase, plies: pliesOf(t700, expectOk(parseLayup('[45/0/-45/90]s'))) }))
    expect(eightPly.firstPlyFailure.reserveFactor).toBeCloseTo(1.2673, 4)
    expect(result.search.plyCounts).toEqual([8, 10])
  })

  it('picks the 10-ply mix with the higher RF: [45/0₂/−45/90]s, RF 1.966, 1.25 mm, 1.975 kg/m²', () => {
    const best = bestOf(result)
    expect(best.notation).toBe('[45/0₂/−45/90]s')
    expect(best.reserveFactor).toBeCloseTo(1.9655, 4)
    expect(best.thicknessMm).toBeCloseTo(1.25, 12)
    expect(best.arealMassKgPerM2).toBeCloseTo(1.975, 12)
    expect(result.candidates.map((c) => c.notation)).toEqual(['[45/0₂/−45/90]s', '[45/0/−45/90₂]s'])
    expect(result.search).toMatchObject({ sequencesAnalysed: 3, exhaustive: true, orderMatters: false })
  })

  it('every candidate meets every design rule', () => {
    for (const candidate of result.candidates) expectRuleCompliant(candidate, t700, [0, 45, -45, 90])
  })

  it('reports no best laminate, and the closest ones, when the target is out of reach', () => {
    const tooFew = expectOk(optimiseLayup({ ...designCase, maxPlies: 8 }))
    expect(tooFew.best).toBeNull()
    expect(tooFew.candidates[0].notation).toBe('[45/0/−45/90]s')
  })

  it('reports the ply limit it searched to, also when the rules stop the laminate growing before it', () => {
    // Only 0° plies: at most 4 in a row, and the mid-plane run counts twice, so 4 plies is the largest legal laminate.
    const zeroOnly = expectOk(optimiseLayup({ ...designCase, anglesDeg: [0], maxPlies: 24 }))
    expect(zeroOnly.best).toBeNull()
    expect(zeroOnly.search).toMatchObject({ plyCounts: [2, 4], maxPlies: 24 })
    expect(result.search.maxPlies).toBe(48)
  })

  it('gives the same answer every time', () => {
    expect(expectOk(optimiseLayup(designCase))).toEqual(result)
  })
})

describe('optimiseLayup, with a bending moment (the stacking order matters)', () => {
  const input: OptimiseInput = { material: t700, loads: { nxNPerMm: 100, mxN: 100 }, criterion: 'tsai-wu', maxPlies: 16 }
  const result = expectOk(optimiseLayup(input))

  it('compares orders, keeps to the rules, and ranks by reserve factor', () => {
    expect(result.search).toMatchObject({ orderMatters: true, exhaustive: true, plyCounts: [8, 12] })
    const best = bestOf(result)
    expect(best.notation).toBe('[45/0₃/−45/90]s')
    expect(best.reserveFactor).toBeCloseTo(2.385, 3)
    const reserveFactors = result.candidates.map((c) => c.reserveFactor)
    expect(reserveFactors).toEqual([...reserveFactors].sort((a, b) => b - a))
    for (const candidate of result.candidates) expectRuleCompliant(candidate, t700, [0, 45, -45, 90])
  })

  it('no smaller laminate reaches the target', () => {
    expect(expectOk(optimiseLayup({ ...input, maxPlies: 10 })).best).toBeNull()
  })

  it('the order changes the answer: the best 12-ply order beats the reverse order of the same plies', () => {
    const reversedHalf = [90, -45, 0, 0, 0, 45]
    const reversed = expectOk(analyseLaminate({ ...input, plies: pliesOf(t700, [...reversedHalf, ...[...reversedHalf].reverse()]) }))
    expect(reversed.firstPlyFailure.reserveFactor).toBeLessThan(bestOf(result).reserveFactor)
  })
})

describe('optimiseLayup with other angle sets', () => {
  it('uses ±30 and 90 without the ±45 outer-ply rule', () => {
    const result = expectOk(optimiseLayup({ material: t700, loads: { nxNPerMm: 200, nyNPerMm: 50 }, criterion: 'max-stress', anglesDeg: [30, -30, 90] }))
    const best = bestOf(result)
    expect(isBalanced(pliesOf(t700, best.anglesDeg))).toBe(true)
    expect(isSymmetric(pliesOf(t700, best.anglesDeg))).toBe(true)
    expect(longestRun(best.anglesDeg)).toBeLessThanOrEqual(MAX_CONSECUTIVE_PLIES)
    expect(new Set(best.anglesDeg)).toEqual(new Set([30, -30, 90]))
  })

  it.each<[string, Partial<OptimiseInput>, RegExp]>([
    ['unbalanced angle set', { anglesDeg: [0, 30, 90] }, /−30°/],
    ['no angles', { anglesDeg: [] }, /ply angles/],
    ['odd ply limit', { maxPlies: 15 }, /even number/],
    ['too many plies', { maxPlies: 1000 }, /even number/],
    ['too few plies for the rules', { maxPlies: 6 }, /allow more plies/],
    ['bad load', { loads: { nxNPerMm: Number.POSITIVE_INFINITY } }, /load/],
  ])('rejects %s', (_, change, message) => {
    expect(expectError(optimiseLayup({ ...designCase, ...change }))).toMatch(message)
  })
})
