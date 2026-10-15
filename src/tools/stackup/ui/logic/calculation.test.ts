import { describe, expect, it } from 'vitest'
import { STACK_ASSEMBLY_EXAMPLE, seedLibrary } from '../../../../core/library'
import { expectOk } from '../../../../core/testing'
import { SOURCE } from '../../calc'
import { stackInputsFrom } from '../state/readInputs'
import { EXAMPLE_STACK_INPUTS, type StackInputs } from '../state/stackInputs'
import { methodAssumptions, stackFormulas, stackSources } from './calculation'
import { rowTable } from './rowTable'
import { capabilityLine, sideBySide } from './sideBySide'
import { stackResults } from './stackResults'

const SEEDED = '2026-10-14T14:02:00'
const library = seedLibrary(SEEDED)
const analysisOf = (inputs: StackInputs) => expectOk(stackResults(inputs, library).analysis)
const housing = analysisOf(EXAMPLE_STACK_INPUTS)

describe('stackFormulas', () => {
  it('fills the equations with the housing numbers', () => {
    const formulas = Object.fromEntries(stackFormulas(housing, 'si').map((f) => [f.symbol, f]))
    expect(formulas.nominal).toMatchObject({ substitution: '42.000 − 22.000 + ½·1.850', result: '20.925 mm' })
    expect(formulas.mean.result).toBe('20.960 mm')
    expect(formulas.WC).toMatchObject({ substitution: '20.960 ± (0.050 + 0.050 + ½·0.070)', result: '20.825 … 21.095 mm' })
    // The coefficient is squared with its term (S3): (½·0.0233)², not ½·0.0233².
    expect(formulas['σ'].substitution).toBe('√(0.0167² + 0.0167² + (½·0.0233)²)')
    expect(formulas.share_WC.substitution).toBe('0.050 / 0.135 · 0.050 / 0.135 · 0.035 / 0.135')
    expect(formulas.RSS.result).toBe('20.881 … 21.039 mm')
    expect(formulas.Cpk.result).toBe('1.77')
    expect(Object.keys(formulas)).toEqual(['nominal', 'mean', 'WC', 'σ', 'RSS', 'share_WC', 'share_RSS', 'out of spec', 'Cp', 'Cpk'])
  })

  it('fills ⟨ST⟩ rows with their coefficient squared, and their share as the engine works it out (S3)', () => {
    // Rows 1 and 3 ⟨ST⟩: WC = 0.050 + √(0.050² + (½·0.070)²) = 0.050 + 0.0610 = 0.1110.
    const rows = EXAMPLE_STACK_INPUTS.rows.map((row, i) => (i !== 1 && row.kind === 'dimension' ? { ...row, statistical: true } : row))
    const analysis = analysisOf({ ...EXAMPLE_STACK_INPUTS, rows })
    const formulas = Object.fromEntries(stackFormulas(analysis, 'si').map((f) => [f.symbol, f]))
    expect(formulas.WC.substitution).toBe('20.960 ± (0.050) + √(0.050² + (½·0.070)²)')
    const share = formulas.share_WC
    const terms = share.substitution.split(' · ')
    expect(terms).toEqual(['0.050² / 0.061 / 0.111', '0.050 / 0.111', '0.035² / 0.061 / 0.111'])
    // Each substitution, worked with unrounded numbers, gives the engine's %.
    const st = Math.hypot(0.05, 0.035)
    const wc = 0.05 + st
    const worked = [0.05 ** 2 / st / wc, 0.05 / wc, 0.035 ** 2 / st / wc].map((x) => 100 * x)
    analysis.contributors.forEach((row, i) => expect(row.worstCasePercent).toBeCloseTo(worked[i], 9))
    expect(share.result).toBe(analysis.contributors.map((row) => `${row.worstCasePercent.toFixed(1)} %`).join(' · '))
  })

  it('gives Cp and Cpk to two decimals, as the verdict card does', () => {
    const formulas = Object.fromEntries(stackFormulas(housing, 'si').map((f) => [f.symbol, f]))
    expect(formulas.Cpk.result).toMatch(/^\d\.\d\d$/)
    expect(formulas.Cp.result).toMatch(/^\d\.\d\d$/)
  })

  it('writes the band terms to 5 decimals in inches, so the line adds up', () => {
    const wc = stackFormulas(housing, 'imperial').find((f) => f.symbol === 'WC')
    // 0.05 mm = 0.00197 in, 0.07 mm = 0.00276 in: 0.00197 + 0.00197 + 0.00138 = 0.00532 ≈ the ±0.00531 of 0.135 mm.
    expect(wc?.substitution).toBe('0.8252 ± (0.00197 + 0.00197 + ½·0.00276)')
  })

  it('leaves out the capability without a requirement, and Cp with one limit', () => {
    const none = stackFormulas(analysisOf({ ...EXAMPLE_STACK_INPUTS, requirement: { min: null, max: null } }), 'si').map((f) => f.symbol)
    expect(none).toEqual(['nominal', 'mean', 'WC', 'σ', 'RSS', 'share_WC', 'share_RSS'])
    const oneSided = stackFormulas(analysisOf({ ...EXAMPLE_STACK_INPUTS, requirement: { min: 20.8, max: null } }), 'si')
    expect(oneSided.map((f) => f.symbol)).not.toContain('Cp')
    expect(oneSided.find((f) => f.symbol === 'Cpk')?.formula).toBe('(mean − LSL) / 3σ')
  })

  it('adds ⟨ST⟩ rows by RSS in the worst case (hybrid)', () => {
    const rows = EXAMPLE_STACK_INPUTS.rows.map((row, i) => (i === 0 && row.kind === 'dimension' ? { ...row, statistical: true } : row))
    const wc = stackFormulas(analysisOf({ ...EXAMPLE_STACK_INPUTS, rows }), 'si').find((f) => f.symbol === 'WC')
    expect(wc?.substitution).toBe('20.960 ± (0.050 + ½·0.070) + √(0.050²)')
    expect(methodAssumptions(true)).toContain('⟨ST⟩ rows: worst case adds them by RSS (hybrid)')
    expect(methodAssumptions(false)).toHaveLength(4)
    // RSS is graded by Cpk (engine notes §5).
    expect(methodAssumptions(false)).toContain('RSS verdict by Cpk: pass at 1.33 or more, review from 1.00, fail under 1.00')
  })
})

describe('stackSources', () => {
  it('cites the stacking rules, each conversion, the capability and the normal tail, once each', () => {
    const sources = stackSources(housing)
    expect(sources[0]).toBe(SOURCE.drakeStacks)
    expect(sources).toContain(SOURCE.montgomery)
    expect(sources).toContain(SOURCE.numericalRecipes)
    expect(new Set(sources).size).toBe(sources.length)
    for (const row of housing.contributors) for (const part of row.conversion.source.split('; ')) expect(sources).toContain(part.trim())
  })
})

describe('sideBySide', () => {
  it('gives both methods with their margins and their own verdicts', () => {
    const [wc, rss] = sideBySide(housing, 'si')
    expect(wc).toMatchObject({ name: 'Worst case', chosen: true, range: '20.825 … 21.095', halfBand: '±0.135', marginToMin: '+0.025', marginToMax: '+0.005', outOfSpec: '—', status: 'pass' })
    expect(rss).toMatchObject({ name: 'RSS ±3σ', chosen: false, range: '20.881 … 21.039', status: 'pass' })
    expect(capabilityLine(housing, 'si')).toMatch(/^σ 0\.0263 mm · Cp \d\.\d\d · Cpk 1\.77 · mean 20\.960 mm \(nominal 20\.925\)$/)
  })
})

describe('rowTable', () => {
  it('lists the housing rows as entered and as centred', () => {
    const rows = rowTable(EXAMPLE_STACK_INPUTS, housing, new Map(), 'si')
    expect(rows.map((r) => [r.number, r.coefficient, r.nominal, r.tolerance, r.mean, r.halfBand])).toEqual([
      [1, '+', '42.000', '±0.050', '42.000', '±0.050'],
      [2, '−', '22.000', '⌖ | 0.100 | A', '22.000', '±0.050'],
      [3, '+½', '1.850', '+0.140/0', '1.920', '±0.070'],
    ])
    expect(rows[1].geometric?.characteristic).toBe('position')
    expect(rows.every((r) => r.link === null)).toBe(true)
  })

  it('names a linked part by its part and result, with its saved time and state', () => {
    const inputs = stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(SEEDED))
    const results = stackResults(inputs, library)
    const [linked] = rowTable(inputs, expectOk(results.analysis), results.links, 'si')
    expect(linked).toMatchObject({
      label: 'Housing: shoulder to circlip groove', source: 'Housing: shoulder to circlip groove (Examples)', tolerance: '+0.170/−0.100',
      link: { saved: '14 Oct, 14:02', state: 'Linked', broken: false },
    })
  })
})
