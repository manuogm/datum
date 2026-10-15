import { describe, expect, it } from 'vitest'
import { expectOk, relativeDifference } from '../../../core/testing'
import {
  HOUSING_PART_STACK, analyseStack, endPlayAssembly, linkedContributor, type Contributor, type DimensionContributor, type StackInput,
} from '.'

describe('seed Part stack: housing, shoulder to circlip groove (mixed directions, a position tolerance, an unequal tolerance)', () => {
  // L = shoulder depth (+) − groove centre (−) + half groove width (+)
  //   shoulder depth  42.000 ±0.050                     mean 42.000, t 0.050
  //   groove centre   22.000, position 0.1 to A → ±0.05 mean 22.000, t 0.050
  //   half width      0.925 +0.07/0                     mean 0.960,  t 0.035
  const housing = expectOk(analyseStack(HOUSING_PART_STACK))

  it('nominal 42 − 22 + 0.925 = 20.925; mean 42 − 22 + 0.960 = 20.960', () => {
    expect(housing.nominal).toBeCloseTo(20.925, 12)
    expect(housing.mean).toBeCloseTo(20.96, 12)
  })

  it('WC ±(0.05 + 0.05 + 0.035) = ±0.135 → 20.825 … 21.095', () => {
    expect(housing.worstCase.halfBand).toBeCloseTo(0.135, 12)
    expect(housing.worstCase.min).toBeCloseTo(20.825, 12)
    expect(housing.worstCase.max).toBeCloseTo(21.095, 12)
  })

  it('RSS ±√(0.05² + 0.05² + 0.035²) = ±√0.006225 = ±0.07890 → 20.8811 … 21.0389, σ = 0.026300', () => {
    expect(housing.rss.halfBand).toBeCloseTo(0.0788987, 7)
    expect(housing.rss.min).toBeCloseTo(20.8811013, 7)
    expect(housing.rss.max).toBeCloseTo(21.0388987, 7)
    expect(housing.sigma).toBeCloseTo(0.0262996, 7)
  })

  it('requirement 20.80 … 21.10: worst case within, pass (upper margin 0.005 governs)', () => {
    expect(housing.verdict).toEqual({ method: 'worst-case', status: 'pass', basis: 'worst-case-within', governing: 'upper' })
    expect(housing.worstCase.upperMargin).toBeCloseTo(0.005, 12)
    expect(housing.worstCase.lowerMargin).toBeCloseTo(0.025, 12)
  })

  it('shares: WC 37.0 / 37.0 / 25.9 %; RSS 40.2 / 40.2 / 19.7 %', () => {
    expect(housing.contributors.map((row) => row.worstCasePercent)).toEqual([0.05, 0.05, 0.035].map((t) => expect.closeTo((100 * t) / 0.135, 9)))
    expect(housing.contributors.map((row) => row.rssPercent)).toEqual([0.0025, 0.0025, 0.001225].map((t2) => expect.closeTo((100 * t2) / 0.006225, 9)))
    expect(housing.contributors[1].conversion.rule).toMatch(/position/)
  })

  it('stack result for the assembly: 20.925 +0.170/−0.100, σ 0.026300', () => {
    expect(housing.stackResult.upperDeviation).toBeCloseTo(0.17, 12)
    expect(housing.stackResult.lowerDeviation).toBeCloseTo(-0.1, 12)
    expect(housing.stackResult.mean).toBeCloseTo(20.96, 12)
  })
})

describe('seed Assembly stack: bearing end play, linking the housing stack', () => {
  // end play = L (+) − bearing width (−) − spacer (−) − circlip (−)
  //   L        20.925 +0.170/−0.100, σ 0.026300   mean 20.960, t 0.135
  //   bearing  14.000 +0/−0.120                   mean 13.940, t 0.060, σ 0.020
  //   spacer    5.000 ±0.030                      mean  5.000, t 0.030, σ 0.010
  //   circlip   1.750 +0/−0.060                   mean  1.720, t 0.030, σ 0.010
  const housing = expectOk(analyseStack(HOUSING_PART_STACK)).stackResult
  const assembly = expectOk(analyseStack(endPlayAssembly(housing)))

  it('nominal 20.925 − 14 − 5 − 1.75 = 0.175; mean 20.96 − 13.94 − 5 − 1.72 = 0.300', () => {
    expect(assembly.nominal).toBeCloseTo(0.175, 12)
    expect(assembly.mean).toBeCloseTo(0.3, 12)
  })

  it('WC uses the housing WC band: ±(0.135 + 0.06 + 0.03 + 0.03) = ±0.255 → 0.045 … 0.555', () => {
    expect(assembly.worstCase.halfBand).toBeCloseTo(0.255, 12)
    expect(assembly.worstCase.min).toBeCloseTo(0.045, 12)
    expect(assembly.worstCase.max).toBeCloseTo(0.555, 12)
  })

  it('RSS uses the housing σ: σ² = 0.026300² + 0.02² + 0.01² + 0.01², σ = 0.035940, ±3σ = ±0.10782 → 0.1922 … 0.4078', () => {
    expect(assembly.sigma).toBeCloseTo(0.0359398, 7)
    expect(assembly.rss.min).toBeCloseTo(0.1921807, 7)
    expect(assembly.rss.max).toBeCloseTo(0.4078193, 7)
  })

  it('requirement 0.10 … 0.50: WC fails both ends by 0.055, RSS within → review', () => {
    expect(assembly.verdict).toEqual({ method: 'worst-case', status: 'review', basis: 'only-rss-within', governing: 'both' })
    expect(assembly.worstCase.lowerMargin).toBeCloseTo(-0.055, 12)
    expect(assembly.worstCase.upperMargin).toBeCloseTo(-0.055, 12)
  })

  it('Cp = Cpk = 0.40/6σ = 1.855 (centred); 2.6·10⁻⁸ out of spec', () => {
    expect(assembly.capability.cp).toBeCloseTo(1.85496, 5)
    expect(assembly.capability.cpk).toBeCloseTo(1.85496, 5)
    expect(relativeDifference(assembly.fractionOutOfSpec?.total ?? 0, 2.6235280658871665e-8)).toBeLessThan(1e-6)
  })

  it('the housing dominates: WC 52.9 %, RSS 53.5 %', () => {
    expect(assembly.dominant).toEqual({ worstCase: 0, rss: 0 })
    expect(assembly.contributors[0].worstCasePercent).toBeCloseTo(52.941, 3)
    expect(assembly.contributors[0].rssPercent).toBeCloseTo(53.548, 3)
    expect(assembly.contributors[1].rssPercent).toBeCloseTo(30.968, 3)
  })

  it('linking the stack gives the same WC and σ as entering the housing rows directly', () => {
    const housingRows = HOUSING_PART_STACK.contributors as readonly DimensionContributor[]
    const flat = expectOk(analyseStack({ ...endPlayAssembly(housing), contributors: [...housingRows, ...endPlayAssembly(housing).contributors.slice(1)] }))
    expect(flat.worstCase.min).toBeCloseTo(assembly.worstCase.min, 12)
    expect(flat.worstCase.max).toBeCloseTo(assembly.worstCase.max, 12)
    expect(flat.sigma).toBeCloseTo(assembly.sigma, 12)
    expect(flat.nominal).toBeCloseTo(assembly.nominal, 12)
  })
})

describe('Assembly linking two part stacks: gap = bracket slot depth − block height − shim', () => {
  const pm = (plusMinus: number) => ({ kind: 'symmetric', plusMinus }) as const
  // Bracket: slot depth = 50 ±0.10 − 10 +0.10/0 → nominal 40, mean 39.95, WC ±0.15 → 39.80 … 40.10 (+0.10/−0.20),
  //          σ² = (0.10² + 0.05²)/9 = 0.0125/9.
  const bracketInput: StackInput = { name: 'Bracket: slot depth', contributors: [
    { kind: 'dimension', label: 'Overall', sensitivity: 1, nominal: 50, tolerance: pm(0.1) },
    { kind: 'dimension', label: 'Base', sensitivity: -1, nominal: 10, tolerance: { kind: 'deviations', upper: 0.1, lower: 0 } },
  ] }
  // Block: height = 25 ±0.05 + 14.5 +0.10/0 → nominal 39.5, mean 39.55, WC ±0.10 → 39.45 … 39.65 (+0.15/−0.05),
  //        σ² = (0.05² + 0.05²)/9 = 0.005/9.
  const blockInput: StackInput = { name: 'Block: height', contributors: [
    { kind: 'dimension', label: 'Lower part', sensitivity: 1, nominal: 25, tolerance: pm(0.05) },
    { kind: 'dimension', label: 'Upper part', sensitivity: 1, nominal: 14.5, tolerance: { kind: 'deviations', upper: 0.1, lower: 0 } },
  ] }
  const bracket = expectOk(analyseStack(bracketInput)).stackResult
  const block = expectOk(analyseStack(blockInput)).stackResult
  const contributors: readonly Contributor[] = [
    linkedContributor(bracket, 1),
    linkedContributor(block, -1),
    { kind: 'dimension', label: 'Shim', sensitivity: -1, nominal: 0.3, tolerance: pm(0.02) },
  ]
  const assembly = expectOk(analyseStack({ name: 'Gap', contributors, requirement: { min: 0 } }))

  it('part stack results', () => {
    expect(bracket.upperDeviation).toBeCloseTo(0.1, 12)
    expect(bracket.lowerDeviation).toBeCloseTo(-0.2, 12)
    expect(block.upperDeviation).toBeCloseTo(0.15, 12)
    expect(block.lowerDeviation).toBeCloseTo(-0.05, 12)
  })

  it('nominal 40 − 39.5 − 0.3 = 0.20; mean 39.95 − 39.55 − 0.30 = 0.10', () => {
    expect(assembly.nominal).toBeCloseTo(0.2, 12)
    expect(assembly.mean).toBeCloseTo(0.1, 12)
  })

  it('WC ±(0.15 + 0.10 + 0.02) = ±0.27 → −0.17 … 0.37, the same as the limits: 40.10 − 39.45 − 0.28 and 39.80 − 39.65 − 0.32', () => {
    expect(assembly.worstCase.max).toBeCloseTo(40.1 - 39.45 - 0.28, 12)
    expect(assembly.worstCase.min).toBeCloseTo(39.8 - 39.65 - 0.32, 12)
  })

  it('σ² = (0.0125 + 0.005 + 0.02²)/9 = 0.0179/9, σ = 0.044597; RSS −0.0338 … 0.2338', () => {
    expect(assembly.sigma).toBeCloseTo(0.04459696, 8)
    expect(assembly.rss.min).toBeCloseTo(-0.03379088, 8)
  })

  it('min 0: WC and RSS both below → fail; by RSS, Cpk 0.747 < 1.00 → fail, 1.25 % out of spec', () => {
    expect(assembly.verdict?.status).toBe('fail')
    const rss = expectOk(analyseStack({ name: 'Gap', contributors, requirement: { min: 0 }, method: 'rss' }))
    expect(rss.verdict).toEqual({ method: 'rss', status: 'fail', basis: 'rss-not-capable', governing: 'lower' })
    expect(relativeDifference(rss.fractionOutOfSpec?.below ?? 0, 0.012470824429579053)).toBeLessThan(1e-6)
    expect(rss.capability.cpk).toBeCloseTo(0.747435, 6)
  })

  it('equals the flat stack of every part row, with the block rows flipped', () => {
    const flipped = blockInput.contributors.map((row) => ({ ...row, sensitivity: -row.sensitivity }))
    const flat = expectOk(analyseStack({ name: 'Flat', contributors: [...bracketInput.contributors, ...flipped, contributors[2]], requirement: { min: 0 } }))
    expect(flat.worstCase.min).toBeCloseTo(assembly.worstCase.min, 12)
    expect(flat.worstCase.max).toBeCloseTo(assembly.worstCase.max, 12)
    expect(flat.sigma).toBeCloseTo(assembly.sigma, 12)
  })
})
