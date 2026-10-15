// "Show calculation" and the report: the equations of the stack filled with
// this calculation's numbers (engine notes §4), the assumptions (§6) and
// the sources. The numbers are the engine's; this file only writes them out.
import type { UnitSystem } from '../../../../core/units'
import { SOURCE, type StackAnalysis } from '../../calc'
import { len, lengthUnit, outOfSpec, percent, range, sigma, significant } from './format'

export interface Formula {
  readonly symbol: string
  readonly formula: string
  readonly substitution: string
  readonly result: string
}

/** "42.000 − 22.000 + 0.925", with "½·" for a half coefficient and "0.87·" for any other. */
function signedSum(system: UnitSystem, terms: readonly { a: number; value: number }[]): string {
  return terms
    .map(({ a, value }, i) => {
      const size = Math.abs(a)
      const factor = size === 1 ? '' : size === 0.5 ? '½·' : `${significant(size)}·`
      const sign = a < 0 ? (i === 0 ? '−' : ' − ') : i === 0 ? '' : ' + '
      return `${sign}${factor}${len(system, value)}`
    })
    .join('')
}

/** The equations of engine notes §4, filled in. Out of spec, Cp and Cpk only where they are defined. */
export function stackFormulas(analysis: StackAnalysis, system: UnitSystem): Formula[] {
  const unit = lengthUnit(system)
  const rows = analysis.contributors
  const s = (mm: number) => sigma(system, mm)
  const { worstCase: wc, rss, requirement, capability } = analysis
  const statistical = rows.filter((row) => row.statistical)
  const arithmetic = rows.filter((row) => !row.statistical)
  const band = (row: (typeof rows)[number]) => `${Math.abs(row.sensitivity) === 1 ? '' : `${significant(Math.abs(row.sensitivity))}·`}${len(system, row.halfBand)}`
  const wcSum = statistical.length > 0
    ? `(${arithmetic.map(band).join(' + ') || '0'}) + √(${statistical.map((row) => `${band(row)}²`).join(' + ')})`
    : `(${rows.map(band).join(' + ')})`
  const formulas: Formula[] = [
    {
      symbol: 'nominal',
      formula: 'Σ a_i · nominal_i',
      substitution: signedSum(system, rows.map((row) => ({ a: row.sensitivity, value: row.nominal }))),
      result: `${len(system, analysis.nominal)} ${unit}`,
    },
    {
      symbol: 'mean',
      formula: 'Σ a_i · mean_i',
      substitution: signedSum(system, rows.map((row) => ({ a: row.sensitivity, value: row.mean }))),
      result: `${len(system, analysis.mean)} ${unit}`,
    },
    {
      symbol: 'WC',
      formula: statistical.length > 0 ? 'mean ± (Σ_others |a_i| · t_i + √Σ_ST (a_i · t_i)²)' : 'mean ± Σ |a_i| · t_i',
      substitution: `${len(system, analysis.mean)} ± ${wcSum}`,
      result: `${range(system, wc.min, wc.max)} ${unit}`,
    },
    {
      symbol: 'σ',
      formula: '√Σ (a_i · σ_i)², σ_i = t_i / 3 (linked: the part’s σ)',
      substitution: `√(${rows.map((row) => `${Math.abs(row.sensitivity) === 1 ? '' : `${significant(Math.abs(row.sensitivity))}·`}${s(row.sigma)}²`).join(' + ')})`,
      result: `${s(analysis.sigma)} ${unit}`,
    },
    {
      symbol: 'RSS',
      formula: 'mean ± 3σ',
      substitution: `${len(system, analysis.mean)} ± 3 × ${s(analysis.sigma)}`,
      result: `${range(system, rss.min, rss.max)} ${unit}`,
    },
    {
      symbol: 'share_WC',
      formula: '|a_i| · t_i / Σ |a| · t',
      substitution: rows.map((row) => `${len(system, Math.abs(row.sensitivity) * row.halfBand)} / ${len(system, wc.halfBand)}`).join(' · '),
      result: rows.map((row) => percent(row.worstCasePercent)).join(' · '),
    },
    {
      symbol: 'share_RSS',
      formula: '(a_i · σ_i)² / Σ (a · σ)²',
      substitution: rows.map((row) => `${s(Math.abs(row.sensitivity) * row.sigma)}² / ${s(analysis.sigma)}²`).join(' · '),
      result: rows.map((row) => percent(row.rssPercent)).join(' · '),
    },
  ]
  if (requirement && analysis.fractionOutOfSpec) {
    const terms = [
      requirement.min !== undefined && `Φ((${len(system, requirement.min)} − ${len(system, analysis.mean)}) / ${s(analysis.sigma)})`,
      requirement.max !== undefined && `1 − Φ((${len(system, requirement.max)} − ${len(system, analysis.mean)}) / ${s(analysis.sigma)})`,
    ].filter(Boolean)
    formulas.push({
      symbol: 'out of spec',
      formula: 'Φ((LSL − mean) / σ) + 1 − Φ((USL − mean) / σ)',
      substitution: terms.join(' + '),
      result: outOfSpec(analysis.fractionOutOfSpec.total),
    })
  }
  if (requirement && capability.cp !== null && requirement.min !== undefined && requirement.max !== undefined) {
    formulas.push({
      symbol: 'Cp',
      formula: '(USL − LSL) / 6σ',
      substitution: `(${len(system, requirement.max)} − ${len(system, requirement.min)}) / (6 × ${s(analysis.sigma)})`,
      result: significant(capability.cp, 3, true),
    })
  }
  if (requirement && capability.cpk !== null) {
    const sides = [
      requirement.max !== undefined && `${len(system, requirement.max)} − ${len(system, analysis.mean)}`,
      requirement.min !== undefined && `${len(system, analysis.mean)} − ${len(system, requirement.min)}`,
    ].filter(Boolean)
    formulas.push({
      symbol: 'Cpk',
      formula: sides.length === 2 ? 'min(USL − mean, mean − LSL) / 3σ' : requirement.max !== undefined ? '(USL − mean) / 3σ' : '(mean − LSL) / 3σ',
      substitution: `${sides.length === 2 ? `min(${sides.join(', ')})` : `(${sides[0]})`} / (3 × ${s(analysis.sigma)})`,
      result: significant(capability.cpk, 3, true),
    })
  }
  return formulas
}

/** The Method step's read-only assumptions (design §2.3). */
export function methodAssumptions(hasStatistical: boolean): string[] {
  return [
    'Each contributor normal, centred on its mean, ±tolerance = ±3σ',
    'Bonus tolerance and datum shift at their largest value',
    'No modified RSS or Monte Carlo in this version',
    ...(hasStatistical ? ['⟨ST⟩ rows: worst case adds them by RSS (hybrid)'] : []),
  ]
}

/** Engine notes §6: what the stack takes as given. */
export const ASSUMPTIONS: readonly string[] = [
  'The stack is one-dimensional (one direction, a loop diagram) through rigid parts.',
  'Contributors are independent and normal, each centred on its mean with its band at ±3σ (RSS).',
  'No modified RSS, no Monte Carlo, no mean shift or drift factors.',
  'Bonus tolerance and datum shift are taken at their largest value, for the worst case and for RSS alike.',
  'Correlations are not modelled: the same feature in two rows, features of one pattern under a datum shift, or a common zone (CZ).',
  'A pass by worst case is a guarantee; RSS is a statistical estimate (about 0.27 % or fewer outside at ±3σ).',
]

/**
 * Every source the result rests on: the stacking and centring rules, each
 * row's conversion source, ⟨ST⟩ when used, Montgomery for Cp/Cpk and
 * Numerical Recipes for the normal tail. Rows' sources are split on "; ".
 */
export function stackSources(analysis: StackAnalysis): string[] {
  const sources = new Set<string>([SOURCE.drakeStacks, SOURCE.fortini, SOURCE.drakeQuality])
  for (const row of analysis.contributors) for (const part of row.conversion.source.split('; ')) if (part.trim()) sources.add(part.trim())
  if (analysis.contributors.some((row) => row.statistical)) for (const part of SOURCE.statisticalTolerance.split('; ')) sources.add(part)
  sources.add(SOURCE.montgomery)
  sources.add(SOURCE.numericalRecipes)
  return [...sources]
}
