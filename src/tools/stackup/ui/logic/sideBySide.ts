// "Worst case and RSS side by side" (design §5.3): both methods' ranges,
// their margins to the requirement and each method's own verdict, and one
// line with σ, Cp, Cpk and the mean.
import type { UnitSystem } from '../../../../core/units'
import type { MethodRange, StackAnalysis, StackMethod } from '../../calc'
import { index, len, lengthUnit, outOfSpec, plusMinus, range, sigma, signed } from './format'
import { methodVerdict } from './verdict'

export interface MethodLine {
  readonly method: StackMethod
  /** "Worst case", "RSS ±3σ". */
  readonly name: string
  /** The verdict uses this method. */
  readonly chosen: boolean
  readonly range: string
  readonly halfBand: string
  /** Negative: outside. "—" without that limit. */
  readonly marginToMin: string
  readonly marginToMax: string
  /** RSS only. */
  readonly outOfSpec: string
  /** The method's own verdict, null without a requirement. */
  readonly status: 'pass' | 'review' | 'fail' | null
}

export function sideBySide(analysis: StackAnalysis, system: UnitSystem): MethodLine[] {
  const line = (method: StackMethod, name: string, values: MethodRange): MethodLine => ({
    method,
    name,
    chosen: analysis.method === method,
    range: range(system, values.min, values.max),
    halfBand: plusMinus(system, values.halfBand),
    marginToMin: values.lowerMargin === null ? '—' : signed(system, values.lowerMargin),
    marginToMax: values.upperMargin === null ? '—' : signed(system, values.upperMargin),
    outOfSpec: method === 'rss' && analysis.fractionOutOfSpec ? outOfSpec(analysis.fractionOutOfSpec.total) : '—',
    status: methodVerdict(analysis, method)?.status ?? null,
  })
  return [line('worst-case', 'Worst case', analysis.worstCase), line('rss', 'RSS ±3σ', analysis.rss)]
}

/** "σ 0.0263 mm · Cp 1.90 · Cpk 1.77 · mean 20.960 mm (nominal 20.925)". */
export function capabilityLine(analysis: StackAnalysis, system: UnitSystem): string {
  const unit = lengthUnit(system)
  const { cp, cpk } = analysis.capability
  return [
    `σ ${sigma(system, analysis.sigma)} ${unit}`,
    ...(cp !== null ? [`Cp ${index(cp)}`] : []),
    ...(cpk !== null ? [`Cpk ${index(cpk)}`] : []),
    `mean ${len(system, analysis.mean)} ${unit} (nominal ${len(system, analysis.nominal)})`,
  ].join(' · ')
}
