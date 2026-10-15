import { describe, expect, it } from 'vitest'
import { expectOk, relativeDifference } from '../../../core/testing'
import { CPK_PASS, analyseStack, linkedContributor, rssCpk, type Contributor, type DimensionContributor, type PlainTolerance, type StackInput } from '.'

const dim = (label: string, sensitivity: number, nominal: number, tolerance: PlainTolerance, statistical?: boolean): DimensionContributor =>
  ({ kind: 'dimension', label, sensitivity, nominal, tolerance, statistical })
const pm = (plusMinus: number): PlainTolerance => ({ kind: 'symmetric', plusMinus })
const analyse = (contributors: readonly Contributor[], extra: Partial<StackInput> = {}) =>
  expectOk(analyseStack({ name: 'Gap', contributors, ...extra }))

describe('textbook part stack: gap = A − B − C − D', () => {
  // Housing internal width A = 60.00 ±0.10, three parts inside it:
  // B = 20.00 ±0.05, C = 25.00 ±0.08, D = 14.80 ±0.04. Gap must be ≥ 0.
  const contributors = [dim('A', 1, 60, pm(0.1)), dim('B', -1, 20, pm(0.05)), dim('C', -1, 25, pm(0.08)), dim('D', -1, 14.8, pm(0.04))]
  const result = analyse(contributors, { requirement: { min: 0 } })

  it('nominal = mean = 60 − 20 − 25 − 14.8 = 0.20', () => {
    expect(result.nominal).toBeCloseTo(0.2, 12)
    expect(result.mean).toBeCloseTo(0.2, 12)
  })

  it('worst case: ±(0.10 + 0.05 + 0.08 + 0.04) = ±0.27 → −0.07 … 0.47', () => {
    expect(result.worstCase.halfBand).toBeCloseTo(0.27, 12)
    expect(result.worstCase.min).toBeCloseTo(-0.07, 12)
    expect(result.worstCase.max).toBeCloseTo(0.47, 12)
    expect(result.worstCase.lowerMargin).toBeCloseTo(-0.07, 12)
    expect(result.worstCase.upperMargin).toBeNull()
  })

  it('RSS: ±√(0.10² + 0.05² + 0.08² + 0.04²) = ±√0.0205 = ±0.14318 → 0.05682 … 0.34318, σ = 0.04773', () => {
    expect(result.rss.halfBand).toBeCloseTo(0.143178, 6)
    expect(result.rss.min).toBeCloseTo(0.056822, 6)
    expect(result.rss.max).toBeCloseTo(0.343178, 6)
    expect(result.sigma).toBeCloseTo(0.047726, 6)
  })

  it('shares: WC 0.10/0.27 = 37.0 %; RSS 0.0100/0.0205 = 48.8 %; A dominates', () => {
    expect(result.contributors.map((row) => row.worstCasePercent)).toEqual([0.1, 0.05, 0.08, 0.04].map((t) => expect.closeTo((100 * t) / 0.27, 9)))
    expect(result.contributors.map((row) => row.rssPercent)).toEqual([0.01, 0.0025, 0.0064, 0.0016].map((t2) => expect.closeTo((100 * t2) / 0.0205, 9)))
    expect(result.dominant).toEqual({ worstCase: 0, rss: 0 })
  })

  it('worst case fails at −0.07, RSS passes (0.057 ≥ 0): review', () => {
    expect(result.verdict).toEqual({ method: 'worst-case', status: 'review', basis: 'only-rss-within', governing: 'lower' })
  })

  it('by RSS: pass (Cpk 1.397 ≥ 1.33); 1.39·10⁻⁵ out of spec (z = 0.20/0.04773 = 4.19); one-sided Cpk = 0.20/0.14318 = 1.397, no Cp', () => {
    const rss = analyse(contributors, { requirement: { min: 0 }, method: 'rss' })
    expect(rss.verdict?.status).toBe('pass')
    expect(rss.verdict?.basis).toBe('rss-capable')
    expect(relativeDifference(rss.fractionOutOfSpec?.below ?? 0, 1.3912005567198542e-5)).toBeLessThan(1e-6)
    expect(rss.fractionOutOfSpec?.above).toBe(0)
    expect(rss.capability.cp).toBeNull()
    expect(rss.capability.cpk).toBeCloseTo(1.39686, 5)
  })

  it('stack result: nominal 0.20, deviations +0.27/−0.27, σ 0.04773', () => {
    expect(result.stackResult).toEqual({
      name: 'Gap', nominal: expect.closeTo(0.2, 12), mean: expect.closeTo(0.2, 12),
      upperDeviation: expect.closeTo(0.27, 12), lowerDeviation: expect.closeTo(-0.27, 12), sigma: expect.closeTo(0.047726, 6),
      arithmeticHalfBand: expect.closeTo(0.27, 12), statisticalHalfBand: 0,
    })
  })
})

describe('unequal bilateral: gap = A − B, A = 30 +0.20/0, B = 10 +0/−0.10', () => {
  // Centred: A = 30.10 ± 0.10, B = 9.95 ± 0.05. Mean 30.10 − 9.95 = 20.15, WC ±0.15 → 20.00 … 20.30.
  // Check against the limits directly: max = 30.20 − 9.90 = 20.30, min = 30.00 − 10.00 = 20.00.
  const result = analyse([dim('A', 1, 30, { kind: 'deviations', upper: 0.2, lower: 0 }), dim('B', -1, 10, { kind: 'deviations', upper: 0, lower: -0.1 })])

  it('keeps the nominal as entered (20.00) and stacks the means (20.15)', () => {
    expect(result.nominal).toBeCloseTo(20, 12)
    expect(result.mean).toBeCloseTo(20.15, 12)
    expect(result.contributors[0].meanShift).toBeCloseTo(0.1, 12)
    expect(result.contributors[1].meanShift).toBeCloseTo(-0.05, 12)
    expect(result.contributors[0].conversion.rule).toMatch(/mean/)
  })

  it('WC 20.00 … 20.30; RSS 20.15 ± √(0.10² + 0.05²) = ±0.1118', () => {
    expect(result.worstCase.min).toBeCloseTo(20, 12)
    expect(result.worstCase.max).toBeCloseTo(20.3, 12)
    expect(result.rss.halfBand).toBeCloseTo(Math.sqrt(0.0125), 12)
    expect(result.stackResult.upperDeviation).toBeCloseTo(0.3, 12)
    expect(result.stackResult.lowerDeviation).toBeCloseTo(0, 12)
  })

  it('the same dimensions as limits give the same stack', () => {
    const limits = analyse([dim('A', 1, 30, { kind: 'limits', min: 30, max: 30.2 }), dim('B', -1, 10, { kind: 'limits', min: 9.9, max: 10 })])
    expect(limits.worstCase.min).toBeCloseTo(20, 12)
    expect(limits.worstCase.max).toBeCloseTo(20.3, 12)
    expect(limits.sigma).toBeCloseTo(result.sigma, 12)
  })

  it('both deviations on one side: 8 +0.30/+0.10 is 8.20 ± 0.10', () => {
    const row = analyse([dim('C', 1, 8, { kind: 'deviations', upper: 0.3, lower: 0.1 })]).contributors[0]
    expect(row.mean).toBeCloseTo(8.2, 12)
    expect(row.halfBand).toBeCloseTo(0.1, 12)
  })
})

describe('sensitivity coefficients', () => {
  it('a width 1.85 +0.14/0 with a = 0.5 is the same row as half the width, 0.925 +0.07/0, with a = 1', () => {
    const half = analyse([dim('Half width', 1, 0.925, { kind: 'deviations', upper: 0.07, lower: 0 })])
    const scaled = analyse([dim('Width', 0.5, 1.85, { kind: 'deviations', upper: 0.14, lower: 0 })])
    expect(scaled.mean).toBeCloseTo(half.mean, 12)
    expect(scaled.worstCase.halfBand).toBeCloseTo(half.worstCase.halfBand, 12)
    expect(scaled.sigma).toBeCloseTo(half.sigma, 12)
  })
})

describe('⟨ST⟩ statistical tolerances in a worst-case stack (hybrid)', () => {
  // Textbook stack with B and C marked ⟨ST⟩:
  // WC = 0.10 + 0.04 + √(0.05² + 0.08²) = 0.14 + 0.09434 = ±0.23434.
  const result = analyse([dim('A', 1, 60, pm(0.1)), dim('B', -1, 20, pm(0.05), true), dim('C', -1, 25, pm(0.08), true), dim('D', -1, 14.8, pm(0.04))])

  it('combines the ⟨ST⟩ rows by RSS inside the worst case; RSS itself is unchanged', () => {
    expect(result.worstCase.halfBand).toBeCloseTo(0.2343398, 7)
    expect(result.rss.halfBand).toBeCloseTo(Math.sqrt(0.0205), 12)
    expect(result.contributors[1].statistical).toBe(true)
    expect(result.contributors[1].conversion.modifiers.join(' ')).toMatch(/⟨ST⟩/)
  })

  it('worst-case shares still add to 100 %; ⟨ST⟩ rows split their RSS part by variance', () => {
    const shares = result.contributors.map((row) => row.worstCasePercent)
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9)
    // B: 0.09434 × 0.0025/0.0089 / 0.23434
    expect(shares[1]).toBeCloseTo((100 * Math.sqrt(0.0089) * (0.0025 / 0.0089)) / 0.2343398, 4)
  })

  it('the stack result keeps the two parts: arithmetic 0.10 + 0.04 = 0.14, ⟨ST⟩ √0.0089 = 0.09434', () => {
    expect(result.stackResult.arithmeticHalfBand).toBeCloseTo(0.14, 12)
    expect(result.stackResult.statisticalHalfBand).toBeCloseTo(Math.sqrt(0.0089), 12)
  })
})

describe('⟨ST⟩ survives linking: an assembly gives the same worst case as entering the part rows directly', () => {
  // Part: two ⟨ST⟩ ±0.1 rows → WC ±√(0.1² + 0.1²) = ±0.14142, all of it ⟨ST⟩.
  // Assembly: the part + one more ⟨ST⟩ ±0.1 → WC ±√(0.14142² + 0.1²) = ±√0.03 = ±0.17321,
  // the same as three ⟨ST⟩ rows entered directly (not 0.14142 + 0.1 = 0.24142).
  const part = analyse([dim('P1', 1, 10, pm(0.1), true), dim('P2', 1, 5, pm(0.1), true)])
  const st = dim('S', -1, 3, pm(0.1), true)

  it('two ⟨ST⟩ in the part, one in the assembly: ±0.17321', () => {
    const assembly = analyse([linkedContributor(part.stackResult, 1), st])
    const direct = analyse([dim('P1', 1, 10, pm(0.1), true), dim('P2', 1, 5, pm(0.1), true), st])
    expect(assembly.worstCase.halfBand).toBeCloseTo(Math.sqrt(0.03), 12)
    expect(assembly.worstCase.halfBand).toBeCloseTo(direct.worstCase.halfBand, 12)
    expect(assembly.contributors[0].statisticalHalfBand).toBeCloseTo(Math.sqrt(0.02), 12)
    // Shares: the linked part holds 0.02 of the 0.03 ⟨ST⟩ variance: 2/3 of the band.
    expect(assembly.contributors.map((row) => row.worstCasePercent)).toEqual([expect.closeTo(200 / 3, 9), expect.closeTo(100 / 3, 9)])
  })

  it('mixed part (a plain ±0.05, ⟨ST⟩ ±0.1 and ±0.2, an unequal row) linked at −1 with an assembly ⟨ST⟩ row: same as direct', () => {
    const rows = [dim('A', 1, 40, pm(0.05)), dim('B', -1, 12, pm(0.1), true), dim('C', 1, 3, pm(0.2), true),
      dim('D', -1, 8, { kind: 'deviations', upper: 0.1, lower: -0.02 })]
    const mixed = analyse(rows)
    // Arithmetic 0.05 + 0.06 = 0.11; ⟨ST⟩ √(0.01 + 0.04) = 0.22361.
    expect(mixed.stackResult.arithmeticHalfBand).toBeCloseTo(0.11, 12)
    expect(mixed.stackResult.statisticalHalfBand).toBeCloseTo(Math.sqrt(0.05), 12)
    const assembly = analyse([linkedContributor(mixed.stackResult, -1), st, dim('E', 1, 30, pm(0.03))])
    const flipped = rows.map((row) => ({ ...row, sensitivity: -row.sensitivity }))
    const direct = analyse([...flipped, st, dim('E', 1, 30, pm(0.03))])
    expect(assembly.worstCase.min).toBeCloseTo(direct.worstCase.min, 12)
    expect(assembly.worstCase.max).toBeCloseTo(direct.worstCase.max, 12)
    expect(assembly.sigma).toBeCloseTo(direct.sigma, 12)
    expect(assembly.stackResult.statisticalHalfBand).toBeCloseTo(direct.stackResult.statisticalHalfBand ?? Number.NaN, 12)
  })

  it('a result stored before the parts were kept counts all of its band as arithmetic, as before', () => {
    const { arithmeticHalfBand: _a, statisticalHalfBand: _s, ...old } = part.stackResult
    expect(analyse([linkedContributor(old, 1), st]).worstCase.halfBand).toBeCloseTo(Math.sqrt(0.02) + 0.1, 12)
    // Only the arithmetic part stored: the ⟨ST⟩ part is the rest of the band.
    expect(analyse([linkedContributor({ ...old, arithmeticHalfBand: 0 }, 1), st]).worstCase.halfBand).toBeCloseTo(Math.sqrt(0.03), 12)
  })
})

describe('verdicts', () => {
  const chain = [dim('A', 1, 10, pm(0.1)), dim('B', -1, 5, pm(0.1))]
  // Mean 5, WC ±0.20, RSS ±0.14142, σ = 0.04714, ±2σ = ±0.09428.

  it('no requirement: no verdict, no fraction out of spec, no capability', () => {
    const result = analyse(chain)
    expect(result.verdict).toBeNull()
    expect(result.requirement).toBeNull()
    expect(result.fractionOutOfSpec).toBeNull()
    expect(result.capability).toEqual({ cp: null, cpk: null })
    expect(result.worstCase.withinRequirement).toBeNull()
    expect(analyse(chain, { requirement: {} }).verdict).toBeNull()
  })

  it('worst case within: pass, governed by the closer limit', () => {
    expect(analyse(chain, { requirement: { min: 4.7, max: 5.25 } }).verdict).toEqual({ method: 'worst-case', status: 'pass', basis: 'worst-case-within', governing: 'upper' })
  })

  it('a WC limit met exactly (round-off of 10 − 5 ± 0.2) passes', () => {
    expect(analyse(chain, { requirement: { min: 4.8, max: 5.2 } }).verdict?.status).toBe('pass')
  })

  it('worst case: RSS outside too is a fail', () => {
    expect(analyse(chain, { requirement: { max: 5.1 } }).verdict).toEqual({ method: 'worst-case', status: 'fail', basis: 'rss-outside', governing: 'upper' })
  })

  it('RSS method graded by Cpk (3σ = 0.14142): ≥ 1.33 pass, 1.00 … 1.33 review, below 1.00 fail', () => {
    const verdict = (max: number) => analyse(chain, { requirement: { max }, method: 'rss' }).verdict
    // Cpu = (5.2 − 5)/0.14142 = 1.414
    expect(verdict(5.2)).toEqual({ method: 'rss', status: 'pass', basis: 'rss-capable', governing: 'upper' })
    // Cpu = 0.16/0.14142 = 1.131
    expect(verdict(5.16)).toEqual({ method: 'rss', status: 'review', basis: 'rss-marginal', governing: 'upper' })
    // Cpu exactly 1 (±3σ touches the limit): review
    expect(verdict(5 + Math.sqrt(0.02))?.status).toBe('review')
    // Cpu = 0.1/0.14142 = 0.707: ±3σ outside
    expect(verdict(5.1)).toEqual({ method: 'rss', status: 'fail', basis: 'rss-not-capable', governing: 'upper' })
    // Cpk exactly 1.33 passes
    expect(verdict(5 + CPK_PASS * Math.sqrt(0.02))?.status).toBe('pass')
  })

  it('RSS Cpk from the range equals capability().cpk; both limits use the smaller side', () => {
    const result = analyse(chain, { requirement: { min: 4.85, max: 5.3 }, method: 'rss' })
    expect(rssCpk(result.rss)).toBeCloseTo(result.capability.cpk ?? Number.NaN, 12)
    // min side (5 − 4.85)/0.14142 = 1.0607: review, governed by the lower limit
    expect(result.verdict).toEqual({ method: 'rss', status: 'review', basis: 'rss-marginal', governing: 'lower' })
  })

  it('RSS with σ = 0: pass while the mean meets the requirement, fail when not', () => {
    const exact = [dim('A', 1, 10, pm(0))]
    expect(analyse(exact, { requirement: { min: 9 }, method: 'rss' }).verdict?.basis).toBe('rss-capable')
    expect(analyse(exact, { requirement: { min: 10.5 }, method: 'rss' }).verdict?.status).toBe('fail')
  })

  it('Cp and Cpk with both limits: (5.3 − 4.9)/6σ and (5.3 − 5)/3σ… min side (5 − 4.9)/3σ', () => {
    const sigma = Math.sqrt(0.02) / 3
    const { capability } = analyse(chain, { requirement: { min: 4.9, max: 5.3 } })
    expect(capability.cp).toBeCloseTo(0.4 / (6 * sigma), 12)
    expect(capability.cpk).toBeCloseTo(0.1 / (3 * sigma), 12)
  })

  it('all tolerances zero: σ = 0, no capability, nothing out of spec while the nominal fits', () => {
    const exact = analyse([dim('A', 1, 10, pm(0))], { requirement: { min: 9, max: 11 } })
    expect(exact.sigma).toBe(0)
    expect(exact.capability).toEqual({ cp: null, cpk: null })
    expect(exact.fractionOutOfSpec?.total).toBe(0)
    expect(exact.dominant).toEqual({ worstCase: null, rss: null })
    expect(exact.contributors[0].worstCasePercent).toBe(0)
    expect(analyse([dim('A', 1, 10, pm(0))], { requirement: { min: 10.5 } }).fractionOutOfSpec?.below).toBe(1)
  })
})
