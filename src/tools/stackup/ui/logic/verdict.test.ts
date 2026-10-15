import { describe, expect, it } from 'vitest'
import { STACK_ASSEMBLY_EXAMPLE, seedLibrary } from '../../../../core/library'
import { expectOk } from '../../../../core/testing'
import { stackInputsFrom } from '../state/readInputs'
import { EXAMPLE_STACK_INPUTS, type StackInputs } from '../state/stackInputs'
import { stackResults } from './stackResults'
import { basisText, byShare, lowerName, methodVerdict, stackVerdict, topRows, verdictDetail, verdictSentence } from './verdict'

const SEEDED = '2026-10-14T14:02:00'
const library = seedLibrary(SEEDED)

function worked(inputs: StackInputs) {
  const results = stackResults(inputs, library)
  return { inputs, results, analysis: expectOk(results.analysis) }
}

const housing = worked(EXAMPLE_STACK_INPUTS)
const assembly = worked(stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(SEEDED)))

describe('the verdict of the housing Part stack', () => {
  const { inputs, results, analysis } = housing

  it('says the worst case stays inside and which limit is closest', () => {
    expect(verdictSentence(inputs, results, analysis, 'si')).toBe(
      'The worst-case shoulder to circlip groove, 20.825 … 21.095 mm, stays inside 20.800 … 21.100 mm; the maximum is closest, 0.005 mm away.',
    )
  })

  it('shows the nominal and the RSS estimate out of spec on the detail line', () => {
    expect(verdictDetail(inputs, results, analysis, 'si')).toMatch(/^Nominal 20\.925 mm · RSS: .+ out of spec$/)
  })

  it('names the two rows that tie for the largest share', () => {
    expect(topRows(analysis)).toEqual([0, 1])
    const verdict = stackVerdict(inputs, results, analysis, 'si')
    expect(verdict.status).toBe('pass')
    expect(verdict.headline).toMatchObject({ symbol: 'WC', value: '20.825 … 21.095', target: '20.800 … 21.100' })
    expect(verdict.figures.map((f) => f.value)).toEqual(['20.881 … 21.039', '1.77', '37 %'])
    expect(verdict.figures[2].symbol).toBe('#1 #2')
    expect(verdict.reference).toBe('1D · WORST CASE')
  })

  it('judges by RSS when asked, with worst case as the second figure', () => {
    const rss = worked({ ...EXAMPLE_STACK_INPUTS, method: 'rss' })
    const verdict = stackVerdict(rss.inputs, rss.results, rss.analysis, 'si')
    expect(verdict.headline.symbol).toBe('RSS')
    expect(verdict.figures[0]).toMatchObject({ label: 'Worst case', value: '20.825 … 21.095' })
    // Cpk 1.77 ≥ 1.33: capable. The tail is under 0.001 %, written without "about".
    expect(verdictSentence(rss.inputs, rss.results, rss.analysis, 'si')).toBe(
      'The RSS range of shoulder to circlip groove, 20.881 … 21.039 mm, stays inside 20.800 … 21.100 mm; Cpk 1.77; under 0.001 % falls outside.',
    )
  })

  it('says what the stack adds up to without a requirement', () => {
    const none = worked({ ...EXAMPLE_STACK_INPUTS, requirement: { min: null, max: null } })
    expect(none.analysis.verdict).toBeNull()
    expect(stackVerdict(none.inputs, none.results, none.analysis, 'si').status).toBe('none')
    expect(verdictSentence(none.inputs, none.results, none.analysis, 'si')).toBe(
      'Shoulder to circlip groove is 20.825 … 21.095 mm worst case and 20.881 … 21.039 mm RSS; no requirement is set.',
    )
    expect(verdictDetail(none.inputs, none.results, none.analysis, 'si')).toBe('Nominal 20.925 mm · set a minimum or maximum on the Requirement step to judge it')
    expect(basisText(none.analysis, 0)).toBe('No minimum or maximum set')
    expect(methodVerdict(none.analysis, 'rss')).toBeNull()
  })

  it('words a one-sided requirement', () => {
    const min = worked({ ...EXAMPLE_STACK_INPUTS, requirement: { min: 20.8, max: null } })
    expect(verdictSentence(min.inputs, min.results, min.analysis, 'si')).toBe(
      'The worst-case shoulder to circlip groove, 20.825 … 21.095 mm, stays above 20.800 mm; the minimum is closest, 0.025 mm away.',
    )
  })

  it('names both margins when both limits are missed (S9)', () => {
    const tight = worked({ ...EXAMPLE_STACK_INPUTS, requirement: { min: 20.9, max: 21 } })
    expect(tight.analysis.verdict?.status).toBe('fail')
    expect(verdictSentence(tight.inputs, tight.results, tight.analysis, 'si')).toBe(
      'Even the RSS range, 20.881 … 21.039 mm, misses the minimum by 0.019 mm and the maximum by 0.039 mm; row 1, Shoulder depth from face A governs.',
    )
    // Only the maximum missed: only the maximum named.
    const high = worked({ ...EXAMPLE_STACK_INPUTS, requirement: { min: 20.8, max: 21.08 } })
    expect(verdictSentence(high.inputs, high.results, high.analysis, 'si')).toBe(
      'The worst-case shoulder to circlip groove, 20.825 … 21.095 mm, misses the maximum by 0.015 mm; the RSS range stays inside.',
    )
  })

  it('words a marginal RSS capability (1.00 ≤ Cpk < 1.33)', () => {
    // σ 0.0263: limits 0.1 from the mean give Cpk 1.27.
    const marginal = worked({ ...EXAMPLE_STACK_INPUTS, method: 'rss', requirement: { min: 20.86, max: 21.06 } })
    expect(marginal.analysis.verdict?.basis).toBe('rss-marginal')
    expect(verdictSentence(marginal.inputs, marginal.results, marginal.analysis, 'si')).toMatch(
      /^The RSS range of shoulder to circlip groove, 20\.881 … 21\.039 mm, stays inside 20\.860 … 21\.060 mm, but Cpk 1\.27 is under the 1\.33 of a capable process; about .+ % of builds would fall outside\.$/,
    )
  })
})

describe('the verdict of the Bearing end play assembly', () => {
  const { inputs, results, analysis } = assembly

  it('is a review: worst case outside on both sides, RSS inside', () => {
    expect(analysis.verdict?.basis).toBe('only-rss-within')
    expect(verdictSentence(inputs, results, analysis, 'si')).toBe(
      'The worst-case bearing end play, 0.045 … 0.555 mm, misses both limits of 0.100 … 0.500 mm by 0.055 mm; the RSS range stays inside.',
    )
  })

  it('names the dominant part', () => {
    const verdict = stackVerdict(inputs, results, analysis, 'si')
    expect(verdict.dominant?.partName).toBe('Housing')
    expect(verdict.figures[2]).toMatchObject({ label: 'Dominant part', symbol: 'Housing' })
    expect(verdictDetail(inputs, results, analysis, 'si')).toMatch(/^Nominal 0\.175 mm · the Housing stack dominates · RSS: .+ out of spec$/)
  })

  it('gives each method its own verdict', () => {
    expect(methodVerdict(analysis, 'worst-case')?.status).toBe('review')
    expect(methodVerdict(analysis, 'rss')?.status).toBe('pass')
  })

  it('adds the broken links to the status words of a pass', () => {
    const rss = worked({ ...inputs, method: 'rss' })
    expect(basisText(rss.analysis, 0)).toBe('RSS (±3σ) inside the requirement, Cpk ≥ 1.33')
    expect(basisText(rss.analysis, 1)).toBe('RSS (±3σ) inside the requirement, Cpk ≥ 1.33; review: 1 linked part uses last known values')
  })
})

describe('small helpers', () => {
  it('orders rows by share, ties in chain order', () => {
    expect(byShare([10, 40, 40, 10])).toEqual([1, 2, 0, 3])
  })

  it('lowers the first letter of a name inside a sentence, but not an acronym', () => {
    expect(lowerName('Bearing end play')).toBe('bearing end play')
    expect(lowerName('OD to face')).toBe('OD to face')
    expect(lowerName('  ')).toBe('result')
  })
})
