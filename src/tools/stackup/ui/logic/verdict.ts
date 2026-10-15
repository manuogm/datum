// The words and numbers of the stack-up verdict (design §7.1): one sentence
// on what governs and how it stands against the requirement, the detail line,
// the big range by the verdict method against its target, and three figures.
import type { CalculationStatus } from '../../../../core/library'
import type { UnitSystem } from '../../../../core/units'
import { CPK_PASS, CPK_REVIEW, verdictOf, type MethodRange, type StackAnalysis, type StackMethod, type Verdict, type VerdictBasis } from '../../calc'
import type { StackInputs } from '../state/stackInputs'
import { rowLabel } from './engineInput'
import { index, len, lengthUnit, outOfSpec, percent, range, requirementText, sigma } from './format'
import type { ResolvedLink } from './links'
import type { StackResults } from './stackResults'
import { stackStatus } from './stackResults'

/**
 * The verdict a method gives on its own (the engine judges by the chosen
 * method only): for the result strip on Method and the side-by-side table.
 * Uses the engine's own rule and ranges; null without a requirement.
 */
export function methodVerdict(analysis: StackAnalysis, method: StackMethod): Verdict | null {
  // RSS is graded by Cpk from its own range (rules.ts rssCpk), so the two ranges are all it takes.
  return verdictOf(method, analysis.worstCase, analysis.rss)
}

/** The share of each row by the verdict method, in %. */
export const sharesByMethod = (analysis: StackAnalysis, method = analysis.method): number[] =>
  analysis.contributors.map((row) => (method === 'worst-case' ? row.worstCasePercent : row.rssPercent))

/** Row indices by share, largest first; ties keep chain order. */
export function byShare(shares: readonly number[]): number[] {
  return shares.map((_, i) => i).sort((a, b) => shares[b] - shares[a] || a - b)
}

/** The rows with the largest share by the verdict method (several on a tie), 0-based; none when every share is 0. */
export function topRows(analysis: StackAnalysis): number[] {
  const shares = sharesByMethod(analysis)
  const largest = Math.max(...shares)
  return largest > 0 ? shares.flatMap((share, i) => (largest - share <= 1e-9 ? [i] : [])) : []
}

/** How a row is named in a sentence: "row 1, Shoulder depth from face A", or "the Housing stack" for a linked part. */
export function rowInSentence(inputs: StackInputs, links: ReadonlyMap<string, ResolvedLink>, i: number): string {
  const row = inputs.rows[i]
  if (row.kind === 'linked') return `the ${links.get(row.id)?.partName || row.last.partName || 'linked'} stack`
  return `row ${i + 1}, ${rowLabel(row, i)}`
}

/** The linked part with the largest share, when the largest share is a linked row (Assembly). */
export function dominantPart(inputs: StackInputs, results: Pick<StackResults, 'links'>, analysis: StackAnalysis): ResolvedLink | null {
  const [top] = topRows(analysis)
  const row = top === undefined ? undefined : inputs.rows[top]
  return row?.kind === 'linked' ? (results.links.get(row.id) ?? null) : null
}

const SIDE: Record<'lower' | 'upper', string> = { lower: 'minimum', upper: 'maximum' }

/** The limit a range is closest to (or furthest outside), with its margin; both when they are equal. */
function closest(range: MethodRange): { side: 'lower' | 'upper' | 'both'; margin: number } {
  const lower = range.lowerMargin ?? Number.POSITIVE_INFINITY
  const upper = range.upperMargin ?? Number.POSITIVE_INFINITY
  if (Math.abs(lower - upper) <= 1e-9) return { side: 'both', margin: lower }
  return lower < upper ? { side: 'lower', margin: lower } : { side: 'upper', margin: upper }
}

/** "stays inside 20.800 … 21.100 mm", "stays above 20.800 mm", "stays below 21.100 mm". */
function staysInside(system: UnitSystem, requirement: StackInputs['requirement']): string {
  const unit = lengthUnit(system)
  if (requirement.min !== null && requirement.max !== null) return `stays inside ${range(system, requirement.min, requirement.max)} ${unit}`
  return requirement.min !== null ? `stays above ${len(system, requirement.min)} ${unit}` : `stays below ${len(system, requirement.max ?? 0)} ${unit}`
}

/**
 * "misses the maximum by 0.055 mm"; when both limits are missed, both
 * margins: "misses the minimum by 0.020 mm and the maximum by 0.055 mm", or
 * "misses both limits of 0.100 … 0.500 mm by 0.055 mm" when they are equal.
 */
function misses(system: UnitSystem, requirement: StackInputs['requirement'], range: MethodRange): string {
  const unit = lengthUnit(system)
  const by = (margin: number) => `by ${len(system, -margin)} ${unit}`
  const { side, margin } = closest(range)
  if (side === 'both') return `misses both limits of ${requirementText(system, requirement)} ${unit} ${by(margin)}`
  const { lowerMargin, upperMargin } = range
  if (lowerMargin !== null && upperMargin !== null && lowerMargin < 0 && upperMargin < 0) {
    return `misses the minimum ${by(lowerMargin)} and the maximum ${by(upperMargin)}`
  }
  return `misses the ${SIDE[side]} ${by(margin)}`
}

/** "about 0.27 %", but "under 0.001 %" (not "about under"). */
function aboutOutOfSpec(fraction: number): string {
  const text = outOfSpec(fraction)
  return text.startsWith('under') ? text : `about ${text}`
}

/** One sentence: what governs and how the result stands against the requirement (design §7.1). */
export function verdictSentence(inputs: StackInputs, results: Pick<StackResults, 'links'>, analysis: StackAnalysis, system: UnitSystem): string {
  const result = lowerName(inputs.resultName)
  const unit = lengthUnit(system)
  const { worstCase: wc, rss, verdict } = analysis
  if (!verdict) {
    return `${upperName(inputs.resultName)} is ${range(system, wc.min, wc.max)} ${unit} worst case and ${range(system, rss.min, rss.max)} ${unit} RSS; no requirement is set.`
  }
  const top = topRows(analysis)
  const governs = top.length > 0 ? rowInSentence(inputs, results.links, top[0]) : 'no row'
  const oos = aboutOutOfSpec(analysis.fractionOutOfSpec?.total ?? 0)
  const { cpk } = analysis.capability
  const rssRange = `The RSS range of ${result}, ${range(system, rss.min, rss.max)} ${unit},`
  let sentence: string
  switch (verdict.basis) {
    case 'worst-case-within': {
      const { side, margin } = closest(wc)
      const room = side === 'both' ? `both limits are ${len(system, margin)} ${unit} away` : `the ${SIDE[side]} is closest, ${len(system, margin)} ${unit} away`
      sentence = `The worst-case ${result}, ${range(system, wc.min, wc.max)} ${unit}, ${staysInside(system, inputs.requirement)}; ${room}`
      break
    }
    case 'only-rss-within':
      sentence = `The worst-case ${result}, ${range(system, wc.min, wc.max)} ${unit}, ${misses(system, inputs.requirement, wc)}; the RSS range stays inside`
      break
    case 'rss-outside':
      sentence = `Even the RSS range, ${range(system, rss.min, rss.max)} ${unit}, ${misses(system, inputs.requirement, rss)}; ${governs} governs`
      break
    // RSS graded by capability (calc/rules.ts: pass at Cpk ≥ CPK_PASS 1.33, review from CPK_REVIEW 1.00; AIAG SPC Manual 2nd ed. 2005; Montgomery §8.3).
    case 'rss-capable':
    case 'rss-within':
      sentence = `${rssRange} ${staysInside(system, inputs.requirement)}${cpk === null ? '' : `; Cpk ${index(cpk)}`}; ${oos} falls outside`
      break
    case 'rss-marginal':
      sentence = `${rssRange} ${staysInside(system, inputs.requirement)}, but Cpk ${cpk === null ? '—' : index(cpk)} is under the ${index(CPK_PASS)} of a capable process; ${oos} of builds would fall outside`
      break
    case 'rss-not-capable':
      sentence = `${rssRange} ${misses(system, inputs.requirement, rss)}; ${oos} of builds would fall outside, and ${governs} governs`
      break
    // Bases of the older ±2σ grading, no longer produced.
    case 'only-two-sigma-within':
      sentence = `The RSS range ${misses(system, inputs.requirement, rss)}; ${oos} of builds would fall outside`
      break
    case 'two-sigma-outside':
      sentence = `Even ±2σ misses the requirement; ${oos} of builds would fall outside, and ${governs} governs`
      break
  }
  return `${sentence}.`
}

/**
 * The detail line: the nominal; in an assembly that is not a pass, the part
 * that dominates (the first to tighten); then the broken links, or the RSS
 * estimate of builds out of spec.
 */
export function verdictDetail(
  inputs: StackInputs, results: Pick<StackResults, 'links' | 'brokenLinks'>, analysis: StackAnalysis, system: UnitSystem,
): string {
  const parts = [`Nominal ${len(system, analysis.nominal)} ${lengthUnit(system)}`]
  if (!analysis.verdict) return `${parts[0]} · set a minimum or maximum on the Requirement step to judge it`
  const dominant = inputs.mode === 'assembly' && analysis.verdict.status !== 'pass' ? dominantPart(inputs, results, analysis) : null
  if (dominant) parts.push(`the ${dominant.partName} stack dominates`)
  const broken = results.brokenLinks.length
  if (broken > 0) parts.push(`${broken === 1 ? '1 linked part uses' : `${broken} linked parts use`} last known values`)
  else if (analysis.fractionOutOfSpec) parts.push(`RSS: ${outOfSpec(analysis.fractionOutOfSpec.total)} out of spec`)
  return parts.join(' · ')
}

export interface VerdictFigureText {
  readonly label: string
  readonly symbol?: string
  readonly value: string
  readonly unit?: string
}

export interface StackVerdictText {
  readonly status: CalculationStatus
  readonly sentence: string
  readonly detail: string
  readonly headline: VerdictFigureText & { readonly target: string }
  readonly figures: readonly VerdictFigureText[]
  readonly reference: string
  /** Assembly: the linked part with the largest share, to open first. */
  readonly dominant: ResolvedLink | null
}

/** Everything the verdict card shows. */
export function stackVerdict(inputs: StackInputs, results: StackResults, analysis: StackAnalysis, system: UnitSystem): StackVerdictText {
  const unit = lengthUnit(system)
  const wcFirst = analysis.method === 'worst-case'
  const [chosen, other] = wcFirst ? [analysis.worstCase, analysis.rss] : [analysis.rss, analysis.worstCase]
  const { cpk } = analysis.capability
  const top = topRows(analysis)
  const shares = sharesByMethod(analysis)
  const dominant = inputs.mode === 'assembly' ? dominantPart(inputs, results, analysis) : null
  const topFigure: VerdictFigureText = dominant
    ? { label: 'Dominant part', symbol: dominant.partName, value: percent(shares[top[0]], 0) }
    : { label: 'Top contributor', symbol: top.map((i) => `#${i + 1}`).join(' ') || '—', value: top.length > 0 ? percent(shares[top[0]], 0) : '—' }
  return {
    status: stackStatus(analysis, results.brokenLinks.length),
    sentence: verdictSentence(inputs, results, analysis, system),
    detail: verdictDetail(inputs, results, analysis, system),
    headline: {
      label: upperName(inputs.resultName),
      symbol: wcFirst ? 'WC' : 'RSS',
      value: range(system, chosen.min, chosen.max),
      unit,
      target: requirementText(system, inputs.requirement),
    },
    figures: [
      wcFirst ? { label: 'RSS', symbol: '±3σ', value: range(system, other.min, other.max), unit } : { label: 'Worst case', symbol: 'WC', value: range(system, other.min, other.max), unit },
      cpk !== null ? { label: 'Capability', symbol: 'Cpk', value: index(cpk) } : { label: 'Std deviation', symbol: 'σ', value: sigma(system, analysis.sigma), unit },
      topFigure,
    ],
    reference: wcFirst ? '1D · WORST CASE' : '1D · RSS ±3σ',
    dominant,
  }
}

/** The result's name for the start of a sentence ("Result" when empty). */
export const upperName = (resultName: string): string => resultName.trim() || 'Result'

/** The result's name inside a sentence: "shoulder to circlip groove" (an acronym keeps its case). */
export function lowerName(resultName: string): string {
  const name = upperName(resultName)
  return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name
}

const BASIS_WORDS: Record<VerdictBasis, string> = {
  'worst-case-within': 'Worst case inside the requirement',
  'only-rss-within': 'Worst case outside; RSS (±3σ) inside',
  'rss-outside': 'RSS (±3σ) outside as well',
  'rss-within': 'RSS (±3σ) inside the requirement',
  'rss-capable': `RSS (±3σ) inside the requirement, Cpk ≥ ${CPK_PASS.toFixed(2)}`,
  'rss-marginal': `RSS (±3σ) inside the requirement, ${CPK_REVIEW.toFixed(2)} ≤ Cpk < ${CPK_PASS.toFixed(2)}`,
  'rss-not-capable': `RSS: Cpk under ${CPK_REVIEW.toFixed(2)}, ±3σ outside the requirement`,
  'only-two-sigma-within': '±3σ outside; ±2σ inside',
  'two-sigma-outside': '±2σ outside the requirement',
}

/** Why the status is what it is, in words (the report's status cell). */
export function basisText(analysis: StackAnalysis, brokenLinks: number): string {
  if (!analysis.verdict) return 'No minimum or maximum set'
  const words = BASIS_WORDS[analysis.verdict.basis]
  if (brokenLinks === 0 || analysis.verdict.status !== 'pass') return words
  return `${words}; review: ${brokenLinks === 1 ? '1 linked part uses' : `${brokenLinks} linked parts use`} last known values`
}
