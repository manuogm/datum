// "Show calculation" and the report: the equations of the stack filled with
// this calculation's numbers (engine notes §4), the assumptions (§8) and
// the sources. The numbers are the engine's; this file only writes them out.
import type { UnitSystem } from '../../../../core/units'
import { CPK_PASS, CPK_REVIEW, SOURCE, type StackAnalysis } from '../../calc'
import { bandLen, index, len, lengthUnit, outOfSpec, percent, range, sigma, significant } from './format'

export interface Formula {
  readonly symbol: string
  readonly formula: string
  readonly substitution: string
  readonly result: string
}

/** "", "½·" or "0.87·": how a coefficient a_i of size other than 1 is written before its term. */
function factorOf(a: number): string {
  const size = Math.abs(a)
  return size === 1 ? '' : size === 0.5 ? '½·' : `${significant(size)}·`
}

/** "42.000 − 22.000 + ½·1.850", with "½·" for a half coefficient and "0.87·" for any other. */
function signedSum(system: UnitSystem, terms: readonly { a: number; value: number }[]): string {
  return terms
    .map(({ a, value }, i) => {
      const sign = a < 0 ? (i === 0 ? '−' : ' − ') : i === 0 ? '' : ' + '
      return `${sign}${factorOf(a)}${len(system, value)}`
    })
    .join('')
}

/**
 * A term a·x squared: "0.0500²", or "(½·0.0333)²" with a coefficient, so the
 * coefficient is squared too, as the engine does ((a_i·σ_i)², engine notes §4).
 */
function squared(a: number, text: string): string {
  const factor = factorOf(a)
  return factor ? `(${factor}${text})²` : `${text}²`
}

/** The equations of engine notes §4, filled in. Out of spec, Cp and Cpk only where they are defined. */
export function stackFormulas(analysis: StackAnalysis, system: UnitSystem): Formula[] {
  const unit = lengthUnit(system)
  const rows = analysis.contributors
  const s = (mm: number) => sigma(system, mm)
  const t = (mm: number) => bandLen(system, mm)
  const { worstCase: wc, rss, requirement, capability } = analysis
  const statistical = rows.filter((row) => row.statistical)
  const arithmetic = rows.filter((row) => !row.statistical)
  // Hybrid worst case (ASME Y14.5-2018 statistical tolerancing; Drake ch. 9): ⟨ST⟩ rows by RSS, added to the sum of the others.
  const statisticalPart = Math.sqrt(statistical.reduce((sum, row) => sum + (row.sensitivity * row.halfBand) ** 2, 0))
  const wcSum = statistical.length > 0
    ? `(${arithmetic.map((row) => `${factorOf(row.sensitivity)}${t(row.halfBand)}`).join(' + ') || '0'}) + √(${statistical.map((row) => squared(row.sensitivity, t(row.halfBand))).join(' + ')})`
    : `(${rows.map((row) => `${factorOf(row.sensitivity)}${t(row.halfBand)}`).join(' + ')})`
  // A row's share of the WC band as the engine works it out (analyseStack): |a_i|·t_i / WC; an ⟨ST⟩ row
  // gets its share of the RSS part by variance, √Σ_ST · (a_i·t_i)² / Σ_ST (a·t)² = (a_i·t_i)² / √Σ_ST, over WC.
  const shareWc = (row: (typeof rows)[number]) => {
    const band = Math.abs(row.sensitivity) * row.halfBand
    return row.statistical ? `${t(band)}² / ${t(statisticalPart)} / ${t(wc.halfBand)}` : `${t(band)} / ${t(wc.halfBand)}`
  }
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
      substitution: `√(${rows.map((row) => squared(row.sensitivity, s(row.sigma))).join(' + ')})`,
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
      formula: statistical.length > 0 ? '|a_i| · t_i / WC; ⟨ST⟩: (a_i · t_i)² / √Σ_ST (a · t)² / WC' : '|a_i| · t_i / Σ |a| · t',
      substitution: rows.map(shareWc).join(' · '),
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
      result: index(capability.cp),
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
      result: index(capability.cpk),
    })
  }
  return formulas
}

/** The Method step's read-only assumptions (design §2.3). */
export function methodAssumptions(hasStatistical: boolean): string[] {
  return [
    'Each contributor normal, centred on its mean, ±tolerance = ±3σ',
    // Engine notes §5: RSS graded by capability (AIAG SPC Manual 2nd ed. 2005; Montgomery §8.3).
    `RSS verdict by Cpk: pass at ${index(CPK_PASS)} or more, review from ${index(CPK_REVIEW)}, fail under ${index(CPK_REVIEW)}`,
    'Bonus tolerance and datum shift at their largest value; a datum shift once per frame, as its own row',
    'No modified RSS or Monte Carlo in this version',
    ...(hasStatistical ? ['⟨ST⟩ rows: worst case adds them by RSS (hybrid)'] : []),
  ]
}

/** Engine notes §8: what the stack takes as given (§5 for the RSS grading). */
export const ASSUMPTIONS: readonly string[] = [
  'The stack is one-dimensional (one direction, a loop diagram) through rigid parts.',
  'Contributors are independent and normal, each centred on its mean with its band at ±3σ (RSS).',
  'No modified RSS, no Monte Carlo, no mean shift or drift factors.',
  'Bonus tolerance and datum shift are taken at their largest value, for the worst case and for RSS alike.',
  'A datum shift is its own row, once per datum reference frame, where the chain crosses the datum feature’s interface with its mating part or fixture.',
  'Correlations are not modelled: the same feature in two rows, or a combined zone (CZ, ISO 1101:2017).',
  'A pass by worst case is a guarantee. RSS is a statistical estimate, graded by Cpk: pass at 1.33 or more (about 32 ppm or fewer outside on a side), review from 1.00 to 1.33, fail under 1.00 (AIAG SPC Manual 2005; Montgomery §8.3).',
]

/**
 * Every source the result rests on: the stacking and centring rules, each
 * row's conversion source (an assembly's linked parts' rows too, `parts`),
 * ⟨ST⟩ when used, Montgomery for Cp/Cpk and Numerical Recipes for the
 * normal tail. Rows' sources are split on "; ".
 */
export function stackSources(analysis: StackAnalysis, parts: readonly StackAnalysis[] = []): string[] {
  const sources = new Set<string>([SOURCE.drakeStacks, SOURCE.fortini, SOURCE.drakeQuality])
  const rows = [analysis, ...parts].flatMap((stack) => stack.contributors)
  for (const row of rows) for (const part of row.conversion.source.split('; ')) if (part.trim()) sources.add(part.trim())
  if (rows.some((row) => row.statistical)) for (const part of SOURCE.statisticalTolerance.split('; ')) sources.add(part)
  sources.add(SOURCE.montgomery)
  // The RSS verdict's Cpk thresholds.
  if (analysis.method === 'rss') sources.add(SOURCE.aiag)
  sources.add(SOURCE.numericalRecipes)
  return [...sources]
}
