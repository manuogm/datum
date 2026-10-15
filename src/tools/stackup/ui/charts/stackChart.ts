// What the stack chart draws (design §5), worked out apart from the drawing
// so it can be tested. All values are in the viewer's length unit.
//
//   LOOP · TO SCALE: each row an arrow from the running total before it to
//     the one after it (+ to the right, − to the left); a zero-size row (a
//     form or orientation tolerance, nominal 0) a marker; the result a
//     dimension line from START (0) to END (the nominal).
//   EFFECT ON THE RESULT: each row's band as it lands on the result, about
//     the result's nominal: a × mean shift ± |a| × half band (and, for a
//     linked part, its ±3σ); then the worst-case and RSS ranges against the
//     requirement window.
import { niceAxis, type Axis } from '../../../../app/charts'
import type { IconName } from '../../../../app/ui'
import { toDisplay, type UnitSystem } from '../../../../core/units'
import type { StackAnalysis, StackMethod } from '../../calc'
import { rowLabel } from '../logic/engineInput'
import { len, lengthUnit, percent, plusMinus, range, signed, toleranceText } from '../logic/format'
import type { ResolvedLink } from '../logic/links'
import { lowerName, sharesByMethod, upperName } from '../logic/verdict'
import { gdtIcon } from '../gdt/characteristics'
import type { StackInputs } from '../state/stackInputs'

/** The inputs, the analysis they give and the links they were resolved with: one consistent state to draw. */
export interface ChartSource {
  readonly inputs: StackInputs
  readonly analysis: StackAnalysis
  readonly links: ReadonlyMap<string, ResolvedLink>
}

export type ChartTone = 'ok' | 'warn' | 'bad' | 'neutral'

export interface ChartLane {
  readonly rowId: string
  /** 1-based, as in the list. */
  readonly number: number
  readonly kind: 'arrow' | 'linked' | 'marker'
  /** Running total before and after the row. */
  readonly from: number
  readonly to: number
  readonly icon: IconName | null
  readonly label: string
  readonly nominal: string
  /** The band on the result: centre (a × mean shift) and half width (|a| × half band). */
  readonly centre: number
  readonly half: number
  /** A linked part: its ±3σ on the result. */
  readonly sigmaHalf: number | null
  /** "±0.050", or "+0.035 ±0.035" when the band is off-centre. */
  readonly value: string
  /** "#2 Groove centre from A · −22.000 · ⌖ | 0.100 | A → ±0.050 · 37 % of WC". */
  readonly tooltip: string
}

/** A requirement limit too far out to draw to scale: marked at the panel edge instead. */
export interface OffScale {
  readonly side: 'lower' | 'upper'
  readonly text: string
}

export interface ChartResult {
  readonly label: string
  /** END: the nominal result. */
  readonly end: number
  /** Ranges about the nominal. */
  readonly worstCase: readonly [number, number]
  readonly rss: readonly [number, number]
  /** The requirement about the nominal (a missing or off-scale side is null); null without a requirement. */
  readonly window: { readonly min: number | null; readonly max: number | null } | null
  /** The requirement limits as written ("20.800"), for the window's edge labels. */
  readonly windowText: { readonly min: string | null; readonly max: string | null }
  readonly offScale: readonly OffScale[]
  readonly method: StackMethod
  /** The verdict method's colour (the other method is neutral). */
  readonly tone: ChartTone
  readonly worstCaseText: string
  readonly rssText: string
}

export interface StackChartModel {
  readonly lanes: readonly ChartLane[]
  readonly result: ChartResult
  readonly loopAxis: Axis
  readonly effectAxis: Axis
  readonly hasLinked: boolean
  readonly unit: string
  readonly ariaLabel: string
}

const TONE: Record<string, ChartTone> = { pass: 'ok', review: 'warn', fail: 'bad' }

/** A requirement limit further from the nominal than this many worst-case half bands is drawn off scale. */
export const OFF_SCALE_FACTOR = 4

/** The verdict method's tone: the status (after the link cap), neutral without a requirement. */
export const chartTone = (status: string): ChartTone => TONE[status] ?? 'neutral'

export function stackChartModel(source: ChartSource, system: UnitSystem, status: string): StackChartModel {
  const { inputs, analysis, links } = source
  const d = (mm: number) => toDisplay('length', system, mm)
  const shares = sharesByMethod(analysis)
  const methodShort = analysis.method === 'worst-case' ? 'WC' : 'RSS'

  let total = 0
  const lanes = analysis.contributors.map((row, i): ChartLane => {
    const input = inputs.rows[i]
    const from = total
    total += d(row.sensitivity * row.nominal)
    const a = row.sensitivity
    const centre = d(a * row.meanShift)
    const half = d(Math.abs(a) * row.halfBand)
    const linked = input?.kind === 'linked' ? links.get(input.id) : undefined
    const label = linked ? `${linked.partName || linked.calculationName} · ${lowerName(linked.resultName)}` : input?.kind === 'dimension' ? rowLabel(input, i) : row.label
    const tolerance = input?.kind === 'dimension' ? toleranceText(system, input.tolerance, input.statistical) : `${signed(system, row.max - row.nominal)}/${signed(system, row.min - row.nominal)}`
    const icon: IconName | null = linked ? 'link' : input?.kind === 'dimension' && input.tolerance.kind === 'geometric' ? gdtIcon(input.tolerance.characteristic) : null
    const value = Math.abs(centre) > 1e-12 ? `${signed(system, a * row.meanShift)} ${plusMinus(system, Math.abs(a) * row.halfBand)}` : plusMinus(system, Math.abs(a) * row.halfBand)
    return {
      rowId: input?.id ?? `row${i}`,
      number: i + 1,
      kind: linked ? 'linked' : row.nominal === 0 ? 'marker' : 'arrow',
      from,
      to: total,
      icon,
      label,
      nominal: len(system, row.nominal),
      centre,
      half,
      sigmaHalf: linked ? d(3 * Math.abs(a) * row.sigma) : null,
      value,
      tooltip: `#${i + 1} ${label} · ${signed(system, a * row.nominal)} · ${tolerance} → ${plusMinus(system, Math.abs(a) * row.halfBand)} · ${percent(shares[i], 0)} of ${methodShort}`,
    }
  })

  const nominal = analysis.nominal
  const { worstCase: wc, rss, requirement } = analysis
  const about = (mm: number) => d(mm - nominal)
  const farOut = (limit: number) => wc.halfBand > 0 && Math.abs(limit - nominal) > OFF_SCALE_FACTOR * wc.halfBand
  const offScale: OffScale[] = []
  let window: ChartResult['window'] = null
  if (requirement) {
    const side = (limit: number | undefined, which: 'lower' | 'upper'): number | null => {
      if (limit === undefined) return null
      if (!farOut(limit)) return about(limit)
      offScale.push({ side: which, text: which === 'lower' ? `◂ ${len(system, limit)}` : `${len(system, limit)} ▸` })
      return null
    }
    window = { min: side(requirement.min, 'lower'), max: side(requirement.max, 'upper') }
  }

  const effectValues = [
    0,
    ...lanes.flatMap((lane) => [lane.centre - lane.half, lane.centre + lane.half]),
    about(wc.min), about(wc.max), about(rss.min), about(rss.max),
    ...(window ? [window.min, window.max].filter((v): v is number => v !== null) : []),
  ]
  const result: ChartResult = {
    label: `${upperName(inputs.resultName)} ${len(system, nominal)}`,
    end: total,
    worstCase: [about(wc.min), about(wc.max)],
    rss: [about(rss.min), about(rss.max)],
    window,
    windowText: {
      min: requirement?.min === undefined ? null : len(system, requirement.min),
      max: requirement?.max === undefined ? null : len(system, requirement.max),
    },
    offScale,
    method: analysis.method,
    tone: chartTone(status),
    worstCaseText: `WC ${range(system, wc.min, wc.max)}`,
    rssText: `RSS ${range(system, rss.min, rss.max)}`,
  }
  const verdictWord = status === 'none' ? 'no requirement is set' : `${status} by ${analysis.method === 'worst-case' ? 'worst case' : 'RSS'}`
  return {
    lanes,
    result,
    loopAxis: niceAxis([0, ...lanes.map((lane) => lane.to)], 6),
    effectAxis: padded(niceAxis(effectValues, 4)),
    hasLinked: lanes.some((lane) => lane.kind === 'linked'),
    unit: lengthUnit(system),
    ariaLabel: `Stack chart. ${upperName(inputs.resultName)}: worst case ${range(system, wc.min, wc.max)} ${lengthUnit(system)}, `
      + `RSS ${range(system, rss.min, rss.max)} ${lengthUnit(system)}; ${verdictWord}.`,
  }
}

/** A symmetric axis about zero reads best for bands about the nominal; keep the nice ticks. */
function padded(axis: Axis): Axis {
  const reach = Math.max(Math.abs(axis.min), Math.abs(axis.max))
  if (reach === 0) return axis
  return niceAxis([-reach, reach], 4)
}

/** The empty chart's loop axis: a short span from START. */
export const EMPTY_LOOP_AXIS: Axis = niceAxis([0, 10], 5)

/** Rough width of a 10 px mono character, for tick labels. */
export const MONO_CHAR = 6.2

/**
 * Where a centred tick label goes so that it stays inside [min, max]: at the
 * tick, or pulled in and anchored to the edge it would cross.
 */
export function edgeLabel(x: number, text: string, min: number, max: number): { x: number; anchor: 'middle' | 'start' | 'end' } {
  const half = (text.length * MONO_CHAR) / 2
  if (x + half > max) return { x: max, anchor: 'end' }
  if (x - half < min) return { x: min, anchor: 'start' }
  return { x, anchor: 'middle' }
}
