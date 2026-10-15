// The stack chart (design §5): the loop drawn to scale on the left, each
// row's effect on the result on the right, one lane per row and the result
// lane last. It is the aside of the chain step and the first block of Show
// details. Drawn at its real width: lanes keep their height, so the chart
// grows with the chain.
import type { ReactNode } from 'react'
import { scaleLinear } from '../../../../app/charts'
import { Icon, LegendItem, MonoLabel, cx } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { upperName } from '../logic/verdict'
import { EMPTY_LOOP_AXIS, MONO_CHAR, edgeLabel, type ChartLane, type ChartResult, type StackChartModel } from './stackChart'
import styles from './charts.module.css'
import { useWidth } from './useWidth'

interface StackChartProps {
  /** null: an empty chain. */
  model: StackChartModel | null
  /** The result's name for the right panel's caption (when the model is null). */
  resultName: string
  unit: string
  start?: string
  end?: string
  selectedRow?: string | null
  onSelectRow?: (rowId: string) => void
  /** The chart shows the last valid chain: dimmed, with this note over it (e.g. "Fix row 3 to update the chart"). */
  staleNote?: string | null
}

const LANE = 34
const TOP = 22
const AXIS = 30
const ARROW_HEAD = 8

export function StackChart({ model, resultName, unit, start, end, selectedRow = null, onSelectRow, staleNote = null }: StackChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>(560)
  const narrow = width < 480
  const loopWidth = Math.round(width * (narrow ? 0.55 : 0.6))
  // On a phone each lane's value goes on its label line, above the band, so
  // the bands get the whole panel; else it has a column at the right edge.
  const valueColumn = narrow ? 10 : 92
  const loop = { left: 22, right: loopWidth - 14 }
  const band = { left: loopWidth + (narrow ? 10 : 12), right: width - valueColumn }
  const lanes = model?.lanes ?? []
  const resultTop = TOP + lanes.length * LANE
  // On a phone the two range texts under the result bands go on two lines.
  const RESULT = narrow ? 78 : 64
  const height = resultTop + RESULT + AXIS
  const loopAxis = model?.loopAxis ?? EMPTY_LOOP_AXIS
  const x = scaleLinear(loopAxis, loop.left, loop.right)
  const e = model ? scaleLinear(model.effectAxis, band.left, band.right) : null
  const caption = `Effect on ${upperName(resultName).toLowerCase()} · ${unit}`
  return (
    <div className={styles.chart}>
      <div className={styles.captions} style={{ gridTemplateColumns: `${loopWidth}px 1fr` }}>
        <MonoLabel size="xs" tone="faint">
          Loop · to scale · {unit}
        </MonoLabel>
        <MonoLabel size="xs" tone="faint" className={styles.effectCaption}>
          {caption}
        </MonoLabel>
      </div>
      <div ref={ref} className={cx(styles.canvas, staleNote && styles.stale)}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={model?.ariaLabel ?? 'Stack chart: no contributors yet.'}>
          {/* An empty chart's note runs across both panels. */}
          {model && <line className={styles.divider} x1={loopWidth} x2={loopWidth} y1={0} y2={resultTop + RESULT} />}
          {lanes.map((lane, i) => (
            <Lane
              key={lane.rowId}
              lane={lane}
              top={TOP + i * LANE}
              width={width}
              x={x}
              e={e}
              loop={loop}
              valueX={width - 4}
              narrow={narrow}
              selected={lane.rowId === selectedRow}
              onSelect={onSelectRow}
            />
          ))}
          <line className={styles.resultRule} x1={0} x2={width} y1={resultTop} y2={resultTop} />
          {/* START and END */}
          <line className={styles.guide} x1={x(0)} x2={x(0)} y1={TOP - 8} y2={resultTop + RESULT - 8} />
          <text className={styles.endText} x={x(0) + 4} y={TOP - 10}>
            {start?.trim() || 'START'}
          </text>
          {model && (
            <>
              <line className={styles.guide} x1={x(model.result.end)} x2={x(model.result.end)} y1={TOP} y2={resultTop + RESULT - 8} />
              <text className={styles.endText} x={x(model.result.end) + 4} y={resultTop + RESULT - 2}>
                {end?.trim() || 'END'}
              </text>
              <ResultLoop result={model.result} top={resultTop} x={x} loopRight={loop.right} />
              {e && <ResultBands result={model.result} top={resultTop} e={e} band={band} width={width} narrow={narrow} />}
            </>
          )}
          <text className={styles.laneNumber} x={4} y={resultTop + 38}>
            =
          </text>
          {!model && (
            <text className={styles.emptyNote} x={width / 2} y={resultTop + 28}>
              {narrow ? 'The loop draws here as you add dimensions.' : 'The loop draws here as you add dimensions, from the start feature to the end.'}
            </text>
          )}
          <Axis ticks={loopAxis.ticks} at={x} y={resultTop + RESULT + 6} decimals={axisDecimals(loopAxis.step)} max={loopWidth - 2} />
          {model && e && <Axis ticks={model.effectAxis.ticks} at={e} y={resultTop + RESULT + 6} decimals={axisDecimals(model.effectAxis.step) + 1} signed min={loopWidth + 4} max={width - 1} />}
        </svg>
        {staleNote && <p className={styles.staleNote}>{staleNote}</p>}
      </div>
      <div className={styles.legend}>
        <LegendItem swatch={<span className={cx(styles.swatch, styles.swatchWorstCase)} />}>Worst case</LegendItem>
        <LegendItem swatch={<span className={cx(styles.swatch, styles.swatchRss)} />}>RSS ±3σ</LegendItem>
        <LegendItem swatch={<span className={cx(styles.swatch, styles.swatchRequired)} />}>Required</LegendItem>
        <LegendItem swatch={<span className={cx(styles.swatch, styles.swatchRow)} />}>Contributor ±</LegendItem>
        {model?.hasLinked && <LegendItem swatch={<span className={cx(styles.swatch, styles.swatchLinked)} />}>Linked part (WC, ±3σ)</LegendItem>}
      </div>
    </div>
  )
}


const axisDecimals = (step: number) => Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9)))

/**
 * An axis with its tick labels. Where the ticks are too close for their
 * labels (a narrow panel), only every second or third is written, counted
 * from 0 so the nominal keeps its label. A label at the panel's edge is
 * pulled in rather than cut or run into the neighbouring panel.
 */
function Axis({ ticks, at, y, decimals, signed = false, min = 0, max }: { ticks: readonly number[]; at: (v: number) => number; y: number; decimals: number; signed?: boolean; min?: number; max: number }) {
  const text = (tick: number) => (tick === 0 ? '0' : formatDecimal(tick, decimals, true, signed))
  const spacing = ticks.length > 1 ? Math.abs(at(ticks[1]) - at(ticks[0])) : Number.POSITIVE_INFINITY
  const widest = Math.max(...ticks.map((tick) => text(tick).length)) * MONO_CHAR + 8
  const every = Math.max(1, Math.ceil(widest / spacing))
  const zero = Math.max(0, ticks.indexOf(0))
  const labelled = (i: number) => (i - zero) % every === 0
  return (
    <g>
      <line className={styles.axisLine} x1={at(ticks[0])} x2={at(ticks[ticks.length - 1])} y1={y} y2={y} />
      {ticks.map((tick, i) => {
        const label = edgeLabel(at(tick), text(tick), min, max)
        return (
          <g key={tick}>
            <line className={styles.axisLine} x1={at(tick)} x2={at(tick)} y1={y} y2={y + 4} />
            {labelled(i) && (
              <text className={styles.tickText} x={label.x} y={y + 16} style={{ textAnchor: label.anchor }}>
                {text(tick)}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

interface LaneProps {
  lane: ChartLane
  top: number
  width: number
  x: (v: number) => number
  e: ((v: number) => number) | null
  loop: { left: number; right: number }
  valueX: number
  narrow: boolean
  selected: boolean
  onSelect?: (rowId: string) => void
}

/** Rough width of a 12 px sans label, to place it inside the panel. */
const textWidth = (text: string) => text.length * 6.4

function Lane({ lane, top, width, x, e, loop, valueX, narrow, selected, onSelect }: LaneProps) {
  const y = top + 24
  const from = x(lane.from)
  const to = x(lane.to)
  const left = Math.min(from, to)
  const right = Math.max(from, to)
  const name = `${lane.label} ${lane.nominal}`
  const iconRoom = lane.icon ? 16 : 0
  // The label starts at the arrow's left end; right-aligned to its right end when it would run out of the panel; the name only in the tooltip when neither fits.
  const full = iconRoom + textWidth(name)
  const fitsLeft = left + full <= loop.right
  const fitsRight = right - full >= 0
  const showName = fitsLeft || fitsRight || !narrow
  const shown = showName ? name : lane.nominal
  const labelX = fitsLeft || !fitsRight ? (lane.kind === 'marker' ? from + 8 : left) : right - (iconRoom + textWidth(shown))
  return (
    <g className={cx(styles.lane, selected && styles.selected, onSelect && styles.clickable)} onClick={onSelect ? () => onSelect(lane.rowId) : undefined}>
      <title>{lane.tooltip}</title>
      <rect className={styles.laneBand} x={0} y={top} width={width} height={LANE} />
      <line className={styles.laneRule} x1={0} x2={width} y1={top + LANE} y2={top + LANE} />
      <text className={styles.laneNumber} x={4} y={y + 4}>
        {lane.number}
      </text>
      {lane.icon && (
        <g transform={`translate(${labelX} ${top + 3})`} className={styles.laneIcon}>
          <Icon name={lane.icon} size={13} />
        </g>
      )}
      <text className={styles.laneLabel} x={labelX + iconRoom} y={top + 14}>
        {shown}
      </text>
      <LoopMark lane={lane} from={from} to={to} y={y} />
      {e && <EffectMark lane={lane} e={e} y={narrow ? y : top + LANE / 2} />}
      <text className={styles.laneValue} x={valueX} y={narrow ? top + 13 : top + LANE / 2 + 4}>
        {lane.value}
      </text>
    </g>
  )
}

function LoopMark({ lane, from, to, y }: { lane: ChartLane; from: number; to: number; y: number }) {
  if (lane.kind === 'marker') return <circle className={styles.marker} cx={from} cy={y} r={3.5} />
  const direction = to >= from ? 1 : -1
  const shaftEnd = Math.abs(to - from) > ARROW_HEAD ? to - direction * ARROW_HEAD : from
  const shaft =
    lane.kind === 'linked' ? (
      <>
        <line className={styles.linkedShaft} x1={from} x2={shaftEnd} y1={y - 1.75} y2={y - 1.75} />
        <line className={styles.linkedShaft} x1={from} x2={shaftEnd} y1={y + 1.75} y2={y + 1.75} />
      </>
    ) : (
      <line className={styles.shaft} x1={from} x2={shaftEnd} y1={y} y2={y} />
    )
  return (
    <g>
      {shaft}
      <line className={styles.shaft} x1={from} x2={from} y1={y - 4} y2={y + 4} />
      <polygon className={styles.head} points={head(to, y, direction)} />
    </g>
  )
}

/** A filled 8 px arrowhead with its tip at (tip, y), pointing right (+1) or left (−1). */
const head = (tip: number, y: number, direction: number) =>
  `${tip},${y} ${tip - direction * ARROW_HEAD},${y - 3.5} ${tip - direction * ARROW_HEAD},${y + 3.5}`

function EffectMark({ lane, e, y }: { lane: ChartLane; e: (v: number) => number; y: number }) {
  const span = (centre: number, half: number) => ({ x: e(centre - half), width: Math.max(1, e(centre + half) - e(centre - half)) })
  const meanTick = Math.abs(lane.centre) > 1e-12 && <line className={styles.meanTick} x1={e(lane.centre)} x2={e(lane.centre)} y1={y - 7} y2={y + 7} />
  if (lane.sigmaHalf !== null) {
    return (
      <g>
        <rect className={styles.linkedBand} {...span(lane.centre, lane.half)} y={y - 7} height={14} />
        <rect className={styles.linkedSigma} {...span(lane.centre, lane.sigmaHalf)} y={y - 3} height={6} />
        {meanTick}
      </g>
    )
  }
  return (
    <g>
      <rect className={styles.rowBand} {...span(lane.centre, lane.half)} y={y - 4} height={8} />
      {meanTick}
    </g>
  )
}

function ResultLoop({ result, top, x, loopRight }: { result: ChartResult; top: number; x: (v: number) => number; loopRight: number }) {
  const y = top + 34
  const start = x(0)
  const end = x(result.end)
  const left = Math.min(start, end)
  const right = Math.max(start, end)
  const short = right - left < 24
  const tone = styles[result.tone]
  const labelWidth = textWidth(result.label)
  const labelX = short ? Math.min(right + 16, loopRight - labelWidth) : left + labelWidth <= loopRight ? left : Math.max(0, right - labelWidth)
  return (
    <g className={cx(styles.resultLoop, tone)}>
      {short ? (
        <>
          <line className={styles.resultShaft} x1={left - 14} x2={right + 14} y1={y} y2={y} />
          <polygon className={styles.resultHead} points={head(left, y, 1)} />
          <polygon className={styles.resultHead} points={head(right, y, -1)} />
        </>
      ) : (
        <>
          <line className={styles.resultShaft} x1={left + ARROW_HEAD} x2={right - ARROW_HEAD} y1={y} y2={y} />
          <polygon className={styles.resultHead} points={head(left, y, -1)} />
          <polygon className={styles.resultHead} points={head(right, y, 1)} />
        </>
      )}
      <text className={styles.resultLabel} x={labelX} y={short ? y + 4 : top + 22}>
        {result.label}
      </text>
    </g>
  )
}

interface ResultBandsProps {
  result: ChartResult
  top: number
  e: (v: number) => number
  band: { left: number; right: number }
  width: number
  narrow: boolean
}

/** Width of a requirement limit's label (mono 10 px). */
const labelRoom = (text: string | null) => (text ?? '').length * MONO_CHAR

function ResultBands({ result, top, e, band, width, narrow }: ResultBandsProps) {
  const y = top + 30
  const tone = styles[result.tone]
  const wcChosen = result.method === 'worst-case'
  const { window } = result
  const parts: ReactNode[] = []
  if (window) {
    const lo = window.min === null ? band.left : e(window.min)
    const hi = window.max === null ? band.right : e(window.max)
    parts.push(<rect key="wash" className={styles.window} x={lo} y={top + 4} width={Math.max(0, hi - lo)} height={44} />)
    // The limits are written inside the window, or outside its edges when it
    // is too narrow for both; a limit with no room outside (at the chart's
    // edge) stays inside, so no label is cut or crossed by a window edge.
    const minRoom = labelRoom(result.windowText.min)
    const maxRoom = labelRoom(result.windowText.max)
    const both = window.min !== null && window.max !== null
    const fits = !both || hi - lo >= minRoom + maxRoom + 12
    const minInside = fits || lo - 3 - minRoom < band.left - 8
    const maxInside = fits || hi + 3 + maxRoom > width - 2
    if (window.min !== null) {
      parts.push(<line key="min" className={styles.windowEdge} x1={lo} x2={lo} y1={top + 2} y2={top + 50} />)
      parts.push(
        <text key="minText" className={cx(styles.windowText, !minInside && styles.end)} x={minInside ? lo + 3 : lo - 3} y={top + 14}>
          {result.windowText.min}
        </text>,
      )
    }
    if (window.max !== null) {
      parts.push(<line key="max" className={styles.windowEdge} x1={hi} x2={hi} y1={top + 2} y2={top + 50} />)
      parts.push(
        <text key="maxText" className={cx(styles.windowText, maxInside && styles.end)} x={maxInside ? hi - 3 : hi + 3} y={top + 14}>
          {result.windowText.max}
        </text>,
      )
    }
  }
  const [wcLo, wcHi] = result.worstCase.map(e)
  const [rssLo, rssHi] = result.rss.map(e)
  // Any part of the worst-case band outside the window.
  const over: [number, number][] = []
  if (window?.min != null && result.worstCase[0] < window.min) over.push([wcLo, Math.min(wcHi, e(window.min))])
  if (window?.max != null && result.worstCase[1] > window.max) over.push([Math.max(wcLo, e(window.max)), wcHi])
  return (
    <g>
      {parts}
      <line className={styles.zeroLine} x1={e(0)} x2={e(0)} y1={TOP - 8} y2={top + 50} />
      <rect className={cx(styles.wcBand, wcChosen && tone)} x={wcLo} y={y - 9} width={Math.max(1, wcHi - wcLo)} height={18} />
      {over.map(([lo, hi]) => (
        <rect key={lo} className={styles.overshoot} x={lo} y={y - 9} width={Math.max(1, hi - lo)} height={18} />
      ))}
      <rect className={cx(styles.rssBand, !wcChosen && tone)} x={rssLo} y={y - 4} width={Math.max(1, rssHi - rssLo)} height={8} />
      {result.offScale.map((mark) => (
        <text key={mark.side} className={cx(styles.windowText, mark.side === 'upper' && styles.end)} x={mark.side === 'lower' ? band.left : width - 4} y={y + 4}>
          {mark.text}
        </text>
      ))}
      <text className={cx(styles.rangeText, wcChosen && tone)} x={band.left} y={top + 62}>
        {result.worstCaseText}
      </text>
      <text className={cx(styles.rangeText, !narrow && styles.end, !wcChosen && tone)} x={narrow ? band.left : width - 4} y={narrow ? top + 76 : top + 62}>
        {result.rssText}
      </text>
    </g>
  )
}
