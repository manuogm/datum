import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk } from '../../../core/testing'
import { adviseFit, type AdvisorMaterial, type FitAdvice, type FitAdvisorInput } from '.'

const al7075 = expectOk(materialById('al-7075-t6')) // α 23.4 µm/(m·K), service limit 120 °C
const steel42CrMo4 = expectOk(materialById('steel-42crmo4-qt')) // α 11.1 µm/(m·K)

/** The Fit advisor screen's example: Ø25 bearing carrier pin, aluminium upright, steel pin. */
const designExample: FitAdvisorInput = {
  nominalMm: 25,
  housing: al7075,
  shaft: steel42CrMo4,
  functions: ['locate', 'transmit-torque'],
  assembly: 'thermal',
  serviceTempC: { minC: -20, maxC: 140 },
  requiredClearanceUm: { minUm: 0, maxUm: 40 },
  maxAssemblyInterferenceUm: 40,
}

const advise = (input: FitAdvisorInput) => expectOk(adviseFit(input))
const candidate = (advice: FitAdvice, designation: string) => {
  const found = advice.candidates.find((c) => c.fit.designation === designation)
  if (!found) throw new Error(`${designation} not among the candidates`)
  return found
}
const statusOf = (advice: FitAdvice, designation: string, checkId: string) =>
  candidate(advice, designation).checks.find((check) => check.id === checkId)?.status

describe('worked example: Ø25, Al 7075-T6 housing, 42CrMo4 shaft, −20 … 140 °C', () => {
  // Hand calculation (ISO 1: limits apply at 20 °C):
  //   ΔC/ΔT = D·(α_housing − α_shaft) = 25 mm × 10⁻³ × (23.4 − 11.1) = 0.3075 µm/K
  //   at 140 °C: 0.3075 × 120 = +36.9 µm      at −20 °C: 0.3075 × (−40) = −12.3 µm
  //   H7/p6 at 20 °C: −35 … −1 µm (ISO 286-2)
  //   → at 140 °C: 1.9 … 35.9 µm;  at −20 °C: −47.3 … −13.3 µm;  in service: −47.3 … 35.9 µm
  //   share inside 0 … 40 µm: (35.9 − 0) / (35.9 + 47.3) = 35.9 / 83.2 = 0.4315
  //   thermal assembly: 35 µm interference + 0.001 × 25 mm = 25 µm joining clearance = 60 µm
  //     housing: 20 + 60 / (25 × 10⁻³ × 23.4) = 20 + 60 / 0.585 = 122.6 °C (> 120 °C limit of 7075-T6)
  //     shaft:   20 − 60 / (25 × 10⁻³ × 11.1) = 20 − 216.2 = −196.2 °C (just below liquid nitrogen)
  //   score (SCORE_POINTS in rules.ts):
  //     window: worst end −20 °C, 47.3 µm below 0 → 40 × 47.3 / 40 = 47.3
  //     heating: 0.2 × (122.56 − 120) = 0.51
  //     torque: clearance share 35.9 / 83.2 = 0.4315 → 20 × 0.4315 = 8.63
  //     locate: 35.9 ≤ 2 × IT7 = 42 µm → 0
  //     100 − 47.3 − 0.51 − 8.63 = 43.56 → 44
  const advice = advise(designExample)
  const p6 = candidate(advice, 'H7/p6')

  it('gives the clearance shift per kelvin', () => {
    expect(advice.clearanceShiftUmPerK).toBeCloseTo(0.3075, 10)
  })

  it('corrects H7/p6 to each service temperature', () => {
    expect(p6.fit.minClearanceUm).toBe(-35)
    expect(p6.fit.maxClearanceUm).toBe(-1)
    expect(p6.atServiceMax).toEqual({ tempC: 140, minUm: 1.9, maxUm: 35.9 })
    expect(p6.atServiceMin).toEqual({ tempC: -20, minUm: -47.3, maxUm: -13.3 })
    expect(p6.atAssembly).toEqual({ tempC: 20, minUm: -35, maxUm: -1 })
    expect(p6.inServiceUm).toEqual({ minUm: -47.3, maxUm: 35.9 })
    expect(p6.windowShare).toBeCloseTo(35.9 / 83.2, 10)
  })

  it('computes the joining temperatures for thermal assembly', () => {
    expect(p6.thermalAssembly?.assemblyClearanceUm).toBe(25)
    expect(p6.thermalAssembly?.housingHeatTempC).toBeCloseTo(122.56, 2)
    expect(p6.thermalAssembly?.shaftCoolTempC).toBeCloseTo(-196.22, 2)
    expect(statusOf(advice, 'H7/p6', 'thermal-assembly')).toBe('warn')
  })

  it('scores H7/p6 44 with its checks', () => {
    expect(p6.checks.map((check) => [check.id, check.status])).toEqual([
      ['service-window', 'warn'],
      ['assembly-interference', 'pass'],
      ['thermal-assembly', 'warn'],
      ['locate', 'pass'],
      ['transmit-torque', 'warn'],
    ])
    const penalty = (id: string) => p6.checks.find((check) => check.id === id)?.penalty
    expect(penalty('service-window')).toBeCloseTo(47.3, 6)
    expect(penalty('thermal-assembly')).toBeCloseTo(0.2 * (60 / 0.585 - 100), 6)
    expect(penalty('transmit-torque')).toBeCloseTo(20 * 35.9 / 83.2, 6)
    expect(penalty('locate')).toBe(0)
    expect(p6.score).toBe(44)
  })

  it('explains in three short sentences: the expansion, why no fit can meet 0 … 40 µm, and the closest fit', () => {
    // Thermal change −20 … 140 °C: 0.3075 × 160 = 49.2 µm; tightest fit tolerance (H7/h6 … H7/u6: IT7 + IT6) = 21 + 13 = 34 µm.
    // 49.2 + 34 > 40, so the window cannot hold at both ends of the range.
    expect(advice.candidates.every((c) => c.windowShare < 1)).toBe(true)
    expect(advice.why).toBe(
      'The Al 7075-T6 housing expands more than the 42CrMo4 +QT shaft (α 23.4 vs 11.1 µm/(m·K)),'
      + ' so the clearance shifts −12.3 µm at −20 °C and +36.9 µm at 140 °C from its 20 °C value.'
      + ' No ISO fit stays inside 0 … 40 µm over the whole service range: the 49.2 µm thermal swing'
      + ' plus the tightest fit tolerance (34 µm) is wider than the window.'
      + ' H7/k6 (score 53) comes closest, with −27.3 … 55.9 µm in service.')
  })

  it('ranks interference-leaning fits above clearance fits that lose location hot, with distinct scores', () => {
    // Penalties (window + locate + torque), by hand:
    //   H7/k6: −27.3 … 55.9 µm; worst end −20 °C 27.3 µm out → 27.3; locate (55.9 − 42)/42 × 20 = 6.62;
    //          torque 55.9/83.2 × 20 = 13.44 → 100 − 47.36 = 52.64 → 53
    //   H7/m6: 33.3 + 3.76 + 12.00 → 51       H7/js6: 24.4 + 10.67 + 15.48 → 49.45 → 49
    //   H7/n6: 40.3 + 0.43 + 10.31 → 48.96 → 49 (ranked after js6 on the unrounded score)
    //   H7/p6: 44 (above)                    H7/h6: 30.9 + 13.76 + 17.04 → 38
    //   H7/g6: 37.9 + 17.10 + 18.73 → 26
    const top = advice.candidates.slice(0, 7).map((c) => [c.fit.designation, c.score])
    expect(top).toEqual([
      ['H7/k6', 53], ['H7/m6', 51], ['H7/js6', 49], ['H7/n6', 49], ['H7/p6', 44], ['H7/h6', 38], ['H7/g6', 26],
    ])
  })

  it('notes that 7075-T6 is used above its service limit', () => {
    expect(advice.materialNotes).toEqual([
      'Al 7075-T6 is advised for sustained service up to about 120 °C; the service range reaches 140 °C.',
    ])
  })
})

describe('worked example: same parts, 20 … 140 °C, window −40 … 40 µm, pressed in', () => {
  const advice = advise({
    ...designExample,
    assembly: 'press',
    serviceTempC: { minC: 20, maxC: 140 },
    requiredClearanceUm: { minUm: -40, maxUm: 40 },
  })

  it('recommends H7/p6: inside the window from 20 °C (−35 … −1 µm) to 140 °C (1.9 … 35.9 µm)', () => {
    // Window and locate met; torque: clearance share 35.9 / (35.9 + 35) = 0.506 → 20 × 0.506 = 10.1 → 89.9 → 90
    const best = advice.candidates[0]
    expect(best.fit.designation).toBe('H7/p6')
    expect(best.windowShare).toBe(1)
    expect(best.score).toBe(90)
    expect(best.thermalAssembly).toBeNull()
    expect(advice.why).toContain('H7/p6 (score 90) stays inside −40 … 40 µm at every service temperature.')
    expect(advice.why).not.toContain('No ISO fit')
  })

  it('penalises H7/r6 for exceeding the 40 µm assembly interference', () => {
    // H7/r6 at 25 mm: −41 … −7 µm at 20 °C, −41 … 29.9 µm in service.
    // Window: 1 µm below −40 at 20 °C → 40 × 1/80 = 0.5; interference over the limit: 30;
    // torque: 20 × 29.9 / 70.9 = 8.43 → 100 − 38.93 = 61.07 → 61
    expect(statusOf(advice, 'H7/r6', 'assembly-interference')).toBe('fail')
    expect(candidate(advice, 'H7/r6').score).toBe(61)
  })
})

describe('housing and shaft of the same material', () => {
  const input: FitAdvisorInput = {
    nominalMm: 25,
    housing: steel42CrMo4,
    shaft: steel42CrMo4,
    functions: ['slide'],
    assembly: 'by-hand',
    serviceTempC: { minC: -20, maxC: 80 },
    requiredClearanceUm: { minUm: 5, maxUm: 50 },
    maxAssemblyInterferenceUm: 0,
  }
  const advice = advise(input)

  it('has no thermal shift: every candidate keeps its 20 °C clearances', () => {
    expect(advice.clearanceShiftUmPerK).toBe(0)
    for (const c of advice.candidates) {
      expect(c.inServiceUm).toEqual({ minUm: c.fit.minClearanceUm, maxUm: c.fit.maxClearanceUm })
    }
    expect(advice.why).toBe('Housing (42CrMo4 +QT) and shaft (42CrMo4 +QT) expand alike, so temperature does not change the fit.'
      + ' H7/g6 (score 100) stays inside 5 … 50 µm at every service temperature.')
    expect(advice.materialNotes).toEqual([])
  })

  it('recommends H7/g6 (7 … 41 µm) for a sliding fit assembled by hand', () => {
    expect(advice.candidates[0].fit.designation).toBe('H7/g6')
    expect(advice.candidates[0].score).toBe(100)
  })

  it('offers the shaft-basis equivalent G7/h6 when asked', () => {
    const shaftBasis = advise({ ...input, basis: 'shaft-basis' })
    expect(shaftBasis.candidates[0].fit.designation).toBe('G7/h6')
    expect(shaftBasis.candidates[0].preferred?.basis).toBe('shaft-basis')
    expect(shaftBasis.candidates.every((c) => c.fit.shaft.letter === 'h')).toBe(true)
  })

  it('fails interference fits for by-hand assembly, sliding and frequent disassembly', () => {
    const often = advise({ ...input, functions: ['slide', 'disassemble-often'] })
    expect(statusOf(often, 'H7/p6', 'by-hand')).toBe('fail')
    expect(statusOf(often, 'H7/p6', 'slide-rotate')).toBe('fail')
    expect(statusOf(often, 'H7/p6', 'disassemble-often')).toBe('fail')
    expect(statusOf(often, 'H7/k6', 'disassemble-often')).toBe('warn') // transition fit
    expect(statusOf(often, 'H7/g6', 'disassemble-often')).toBe('pass')
    expect(candidate(often, 'H7/p6').score).toBe(0) // never below 0
  })

  it('says so when no candidate meets the window', () => {
    // H11/c11, the loosest candidate, gives at most 370 µm at 25 mm.
    const none = advise({ ...input, requiredClearanceUm: { minUm: 500, maxUm: 600 } })
    expect(none.candidates.every((c) => c.windowShare === 0)).toBe(true)
    expect(none.why).toContain('No ISO fit stays inside 500 … 600 µm over the whole service range.')
    expect(none.why).toContain('H11/c11 (score 0) comes closest, with 110 … 370 µm in service.')
  })
})

describe('assembly temperature', () => {
  it('defaults to 20 °C and moves the assembly clearances when given', () => {
    // At 30 °C: shift 0.3075 × 10 = 3.075 µm → H7/p6 −31.925 … 2.075 µm
    const warm = candidate(advise({ ...designExample, assemblyTempC: 30 }), 'H7/p6')
    expect(warm.atAssembly).toEqual({ tempC: 30, minUm: -31.925, maxUm: 2.075 })
  })

  it('suggests cooling the shaft when the housing does not expand', () => {
    const invar: AdvisorMaterial = { name: 'Zero-α housing', thermalExpansionUmPerMK: 0, maxServiceTempC: 200 }
    const advice = advise({ ...designExample, housing: invar })
    const p6 = candidate(advice, 'H7/p6')
    expect(p6.thermalAssembly?.housingHeatTempC).toBeNull()
    expect(p6.checks.find((check) => check.id === 'thermal-assembly')?.message).toMatch(/^The housing does not expand/)
  })
})

describe('text in imperial units', () => {
  const advice = advise({ ...designExample, unitSystem: 'imperial' })

  it('writes the why text in thou, °F and µin/(in·°F), with the same numbers converted', () => {
    // −12.3 µm = −0.48 thou, +36.9 µm = +1.45 thou; −20 °C = −4 °F, 140 °C = 284 °F, 20 °C = 68 °F
    // α: 23.4 × 5/9 = 13, 11.1 × 5/9 = 6.2 µin/(in·°F); window 40 µm = 1.57 thou
    // 49.2 µm = 1.94 thou, 34 µm = 1.34 thou; H7/k6 −27.3 … 55.9 µm = −1.07 … 2.2 thou
    expect(advice.why).toBe(
      'The Al 7075-T6 housing expands more than the 42CrMo4 +QT shaft (α 13 vs 6.2 µin/(in·°F)),'
      + ' so the clearance shifts −0.48 thou at −4 °F and +1.45 thou at 284 °F from its 68 °F value.'
      + ' No ISO fit stays inside 0 … 1.57 thou over the whole service range: the 1.94 thou thermal swing'
      + ' plus the tightest fit tolerance (1.34 thou) is wider than the window.'
      + ' H7/k6 (score 53) comes closest, with −1.07 … 2.2 thou in service.')
  })

  it('writes check messages and notes in imperial units, leaving the numbers and scores in SI', () => {
    // Heating: 122.56 °C = 252.6 °F; limit 120 °C = 248 °F; joining 25 µm = 0.98 thou; cooling −196.22 °C = −321.2 °F
    const p6 = candidate(advice, 'H7/p6')
    expect(p6.checks.find((check) => check.id === 'thermal-assembly')?.message).toBe(
      'Heat the housing to ≥ 252.6 °F for 0.98 thou joining clearance: above the 248 °F service limit of Al 7075-T6,'
      + ' so check its temper accepts a short exposure (cooling the shaft would need −321.2 °F, colder than liquid nitrogen).')
    expect(p6.thermalAssembly?.housingHeatTempC).toBeCloseTo(122.56, 2)
    expect(p6.score).toBe(44)
    expect(advice.materialNotes).toEqual([
      'Al 7075-T6 is advised for sustained service up to about 248 °F; the service range reaches 284 °F.',
    ])
    const allText = [advice.why, ...advice.materialNotes, ...advice.candidates.flatMap((c) => c.checks.map((check) => check.message))]
    expect(allText.filter((text) => /µm|°C/.test(text))).toEqual([])
  })
})

describe('invalid input', () => {
  it.each([
    ['nominal size 0', { nominalMm: 0 }, /greater than 0/],
    ['nominal size beyond ISO 286', { nominalMm: 4000 }, /3150/],
    ['reversed service range', { serviceTempC: { minC: 140, maxC: -20 } }, /service temperature/],
    ['reversed clearance window', { requiredClearanceUm: { minUm: 40, maxUm: 0 } }, /clearance window/],
    ['empty clearance window', { requiredClearanceUm: { minUm: 10, maxUm: 10 } }, /clearance window/],
    ['negative interference limit', { maxAssemblyInterferenceUm: -5 }, /positive/],
    ['missing α', { shaft: { ...steel42CrMo4, thermalExpansionUmPerMK: Number.NaN } }, /must be a number/],
    ['missing assembly temperature', { assemblyTempC: Number.NaN }, /must be a number/],
  ] as const)('explains %s', (_, change, message) => {
    expect(expectError(adviseFit({ ...designExample, ...change }))).toMatch(message)
  })
})
