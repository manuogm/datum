import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk } from '../calc/testHelpers'
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
  //   score: 100 × 0.4315 − 10 (heating warning) − 10 (torque warning) = 23.15 → 23
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

  it('scores H7/p6 23 with its checks', () => {
    expect(p6.checks.map((check) => [check.id, check.status])).toEqual([
      ['service-window', 'warn'],
      ['assembly-interference', 'pass'],
      ['thermal-assembly', 'warn'],
      ['locate', 'pass'],
      ['transmit-torque', 'warn'],
    ])
    expect(p6.score).toBe(23)
  })

  it('explains that no fit can meet 0 … 40 µm over the whole range', () => {
    // Thermal change −20 … 140 °C: 0.3075 × 160 = 49.2 µm; tightest fit tolerance (H7/h6 … H7/u6: IT7 + IT6) = 21 + 13 = 34 µm.
    // 49.2 + 34 > 40, so the window cannot hold at both ends of the range.
    expect(advice.candidates.every((c) => c.windowShare < 1)).toBe(true)
    expect(advice.why).toContain('changes by −12.3 µm at −20 °C and +36.9 µm at 140 °C')
    expect(advice.why).toContain('No candidate keeps the clearance inside 0 … 40 µm')
    expect(advice.why).toContain('(49.2 µm)')
    expect(advice.why).toContain('(34 µm)')
  })

  it('ranks by score, then by how well the fit is centred in the window', () => {
    // H7/js6, k6, m6, n6, h6, g6 all cover the whole 0 … 40 µm window (share 40 / 83.2 = 0.481)
    // and carry two warnings (locate, torque): 48.1 − 20 → 28. H7/js6 (−18.8 … 64.4, mid 22.8 µm)
    // is closest to the window's middle (20 µm).
    const scores = advice.candidates.map((c) => c.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
    expect(advice.candidates[0].fit.designation).toBe('H7/js6')
    expect(advice.candidates[0].score).toBe(28)
    expect(advice.why).toContain('Best match: H7/js6, score 28.')
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
    // 100 × 1 − 10 (torque: up to 35.9 µm clearance hot, needs a key) = 90
    const best = advice.candidates[0]
    expect(best.fit.designation).toBe('H7/p6')
    expect(best.windowShare).toBe(1)
    expect(best.score).toBe(90)
    expect(best.thermalAssembly).toBeNull()
    expect(advice.why).toContain('Best match: H7/p6 (locational interference), score 90.')
    expect(advice.why).not.toContain('No candidate')
  })

  it('penalises H7/r6 for exceeding the 40 µm assembly interference', () => {
    // H7/r6 at 25 mm: −41 … −7 µm at 20 °C, −41 … 29.9 µm in service.
    // Share (29.9 + 40) / (29.9 + 41) = 69.9 / 70.9 = 0.9859 → 98.6 − 30 (interference fail) − 10 (torque) = 58.6 → 59
    expect(statusOf(advice, 'H7/r6', 'assembly-interference')).toBe('fail')
    expect(candidate(advice, 'H7/r6').score).toBe(59)
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
    expect(advice.why).toMatch(/^The 42CrMo4 \+QT housing .* expand alike/)
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
    expect(none.why).toContain('No candidate keeps the clearance inside 500 … 600 µm at every service temperature.')
    expect(none.why).not.toContain('thermal change')
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
