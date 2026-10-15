// The row table of Show calculation and the report (design §7.3, §8): each
// row as entered and as the engine centred it, with its shares, its
// conversion rule and where it comes from. It is also the accessible table
// view of the stack chart.
import type { UnitSystem } from '../../../../core/units'
import type { ContributorResult, StackAnalysis } from '../../calc'
import type { GeometricEntry, StackInputs } from '../state/stackInputs'
import { shiftText } from './datumShifts'
import { rowLabel, stackName } from './engineInput'
import { coefficientText, deviations, len, percent, plusMinus, sigma, toleranceText } from './format'
import { isBroken, linkStateText, type ResolvedLink } from './links'
import { savedText } from './savedText'

export interface RowTableRow {
  readonly id: string
  readonly number: number
  readonly label: string
  /** The row's Source field; for a linked part, its calculation and folder. */
  readonly source: string
  /** "+", "−", "+½" … */
  readonly coefficient: string
  readonly nominal: string
  /** The tolerance as entered, in text (a geometric row also has its frame). */
  readonly tolerance: string
  readonly geometric: GeometricEntry | null
  readonly statistical: boolean
  readonly mean: string
  readonly halfBand: string
  readonly sigma: string
  readonly worstCasePercent: string
  readonly rssPercent: string
  readonly rule: string
  /** A linked part: its saved time and the link's state ("Missing: last known values"). */
  readonly link: { readonly saved: string; readonly state: string; readonly broken: boolean } | null
  readonly contributor: ContributorResult
}

export function rowTable(inputs: StackInputs, analysis: StackAnalysis, links: ReadonlyMap<string, ResolvedLink>, system: UnitSystem): RowTableRow[] {
  return analysis.contributors.map((row, i) => {
    const input = inputs.rows[i]
    const link = input?.kind === 'linked' ? links.get(input.id) : undefined
    const dimension = input?.kind === 'dimension' ? input : null
    const shift = input?.kind === 'datum-shift' ? input : null
    // A row typed in this calculation (not a linked part): its own label and source.
    const own = dimension ?? shift
    return {
      id: input?.id ?? String(i),
      number: i + 1,
      label: own ? rowLabel(own, i) : link ? stackName({ mode: 'part', partName: link.partName, resultName: link.resultName }) : row.label,
      source: own ? own.source.trim() : link ? `${link.calculationName} (${link.folderName})` : '',
      coefficient: coefficientText(row.sensitivity),
      nominal: len(system, row.nominal),
      tolerance: dimension
        ? toleranceText(system, dimension.tolerance, inputs.standard, dimension.statistical)
        : link ? deviations(system, link.stack.upperDeviation, link.stack.lowerDeviation) : shift ? shiftText(shift) : '',
      geometric: dimension?.tolerance.kind === 'geometric' ? dimension.tolerance : null,
      statistical: row.statistical,
      mean: len(system, row.mean),
      halfBand: plusMinus(system, row.halfBand),
      sigma: sigma(system, row.sigma),
      worstCasePercent: percent(row.worstCasePercent),
      rssPercent: percent(row.rssPercent),
      rule: row.conversion.rule,
      link: link ? { saved: savedText(link.updatedAt), state: linkStateText(link), broken: isBroken(link.state) } : null,
      contributor: row,
    }
  })
}
