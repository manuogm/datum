// The tolerance zone diagram, drawn to scale from the ISO 286 analysis: the
// hole zone (blue, hatched) and shaft zone (accent) against the zero line,
// with the min and max clearance dimensioned. The screen variant labels every
// limit deviation; the report variant is the compact drawing of the PDF.
import { useId } from 'react'
import { cx } from '../../../../app/ui'
import { formatQuantity, fromDisplay, toDisplay, unitOf, type UnitSystem } from '../../../../core/units'
import type { FitAnalysis, ToleranceZone } from '../../calc'
import type { Segment } from '../../../../app/charts'
import { REPORT_FRAME, SCREEN_FRAME, zoneDiagramLayout, type DiagramZone, type Dimension } from '../logic/zoneDiagram'
import styles from './ZoneDiagram.module.css'

interface ZoneDiagramProps {
  fit: FitAnalysis
  system: UnitSystem
  variant: 'screen' | 'report'
}

export function ZoneDiagram({ fit, system, variant }: ZoneDiagramProps) {
  const hatchId = useId()
  const frame = variant === 'screen' ? SCREEN_FRAME : REPORT_FRAME
  const shown = (um: number) => toDisplay('deviation', system, um)
  const limits = (zone: ToleranceZone) => ({ upper: shown(zone.upperDeviationUm), lower: shown(zone.lowerDeviationUm) })
  const layout = zoneDiagramLayout(limits(fit.hole), limits(fit.shaft), frame)
  // Deviations from the analysis are in µm; tick values are already in display units.
  const um = (valueUm: number, signed = true) => formatQuantity('deviation', system, valueUm, { signed })
  const tickLabel = (displayValue: number) => um(fromDisplay('deviation', system, displayValue))
  const screen = variant === 'screen'
  const sizes = (zone: ToleranceZone) =>
    [formatQuantity('length', system, zone.minSizeMm), formatQuantity('length', system, zone.maxSizeMm)].join(screen ? ' – ' : '–')
  // Captions go on the outer side of each zone, clear of the gap between them:
  // above the higher zone (the hole in a clearance fit), below the lower one.
  const holeHigher = layout.hole.y + layout.hole.height / 2 <= layout.shaft.y + layout.shaft.height / 2
  const zeroNoteY = layout.zeroY + 16
  const captionY = (zone: DiagramZone, above: boolean) => {
    if (!screen) return frame.height - 14
    if (above) return zone.y - 13
    // A zone ending at the zero line puts its caption a line below the zero-line note.
    const below = zone.y + zone.height + 24
    return Math.abs(below - zeroNoteY) < 14 ? zeroNoteY + 16 : below
  }

  return (
    <svg
      className={cx(styles.diagram, styles[variant])}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      role="img"
      aria-label={`Tolerance zones of ${fit.designation}, to scale`}
    >
      <defs>
        <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className={styles.hatch} x1="0" y1="0" x2="0" y2="7" />
        </pattern>
      </defs>

      {layout.ticks.filter((tick) => tick.value !== 0).map((tick) => (
        <g key={tick.value}>
          <line className={styles.grid} x1={frame.left} x2={frame.right} y1={tick.y} y2={tick.y} />
          <text className={styles.tick} x={frame.left - 10} y={tick.y + 4}>
            {tickLabel(tick.value)}
          </text>
        </g>
      ))}
      {screen && (
        <text className={styles.tick} x={frame.left - 10} y={layout.ticks[layout.ticks.length - 1].y - 16}>
          {unitOf('deviation', system)}
        </text>
      )}
      <line className={styles.zero} x1={frame.left - 4} x2={frame.right} y1={layout.zeroY} y2={layout.zeroY} />
      <text className={cx(styles.tick, styles.zeroLabel)} x={frame.left - 10} y={layout.zeroY + 4}>
        0
      </text>
      {screen && (
        <text className={styles.note} x={frame.left + 6} y={zeroNoteY}>
          zero line · Ø {formatQuantity('length', system, fit.nominalMm)}
        </text>
      )}

      {layout.extensions.map((segment, i) => (
        <line key={i} className={styles.extension} {...segment} />
      ))}

      <Zone
        zone={layout.hole}
        className={styles.hole}
        fill={`url(#${hatchId})`}
        name={fit.hole.designation}
        detail={`IT${fit.hole.grade} = ${um(fit.hole.itUm, false)}`}
        limitLabels={screen ? [`ES ${um(fit.hole.upperDeviationUm)}`, `EI ${um(fit.hole.lowerDeviationUm)}`] : null}
        caption={`HOLE ${sizes(fit.hole)}`}
        captionY={captionY(layout.hole, holeHigher)}
        large={screen}
      />
      <Zone
        zone={layout.shaft}
        className={styles.shaft}
        name={fit.shaft.designation}
        detail={`IT${fit.shaft.grade} = ${um(fit.shaft.itUm, false)}`}
        limitLabels={screen ? [`es ${um(fit.shaft.upperDeviationUm)}`, `ei ${um(fit.shaft.lowerDeviationUm)}`] : null}
        caption={`SHAFT ${sizes(fit.shaft)}`}
        captionY={captionY(layout.shaft, !holeHigher)}
        large={screen}
      />

      <DimensionLine dimension={layout.minDimension} names={['Cmin', 'Imax']} valueText={um(Math.abs(fit.minClearanceUm), false)} inline={!screen} />
      <DimensionLine dimension={layout.maxDimension} names={['Cmax', 'Imin']} valueText={um(Math.abs(fit.maxClearanceUm), false)} inline={!screen} />
    </svg>
  )
}

interface ZoneProps {
  zone: DiagramZone
  className: string
  /** Pattern drawn over the soft fill (the hole's hatching). */
  fill?: string
  name: string
  detail: string
  /** Upper and lower limit deviation labels, or null to leave them out. */
  limitLabels: readonly [string, string] | null
  caption: string
  captionY: number
  /** Screen size: 26px name with the IT line under it. */
  large: boolean
}

function Zone({ zone, className, fill, name, detail, limitLabels, caption, captionY, large }: ZoneProps) {
  const centreX = zone.x + zone.width / 2
  const centreY = zone.y + zone.height / 2
  return (
    <g className={className}>
      <rect className={styles.zoneFill} x={zone.x} y={zone.y} width={zone.width} height={zone.height} />
      <rect className={styles.zoneEdge} x={zone.x} y={zone.y} width={zone.width} height={zone.height} style={fill ? { fill } : undefined} />
      {zone.nameInside && (
        <>
          <text className={cx(styles.zoneName, large && styles.large)} x={centreX} y={large ? centreY + 2 : centreY + 6}>
            {name}
          </text>
          {large && (
            <text className={styles.zoneDetail} x={centreX} y={centreY + 21}>
              {detail}
            </text>
          )}
        </>
      )}
      {limitLabels && (
        <>
          <text className={styles.limitLabel} x={zone.x - 8} y={zone.upperLabelY}>
            {limitLabels[0]}
          </text>
          <text className={styles.limitLabel} x={zone.x - 8} y={zone.lowerLabelY}>
            {limitLabels[1]}
          </text>
        </>
      )}
      <text className={styles.caption} x={centreX} y={captionY}>
        {zone.nameInside ? caption : `${name} · ${caption}`}
      </text>
    </g>
  )
}

interface DimensionLineProps {
  dimension: Dimension
  /** Label when the value is a clearance, and when it is an interference. */
  names: readonly [string, string]
  /** The size of the clearance or interference, formatted. */
  valueText: string
  /** One-line label ("Cmin 7") for the compact report drawing. */
  inline: boolean
}

const ARROW = 8
const ARROW_HALF_WIDTH = 4

function DimensionLine({ dimension, names, valueText, inline }: DimensionLineProps) {
  const { x, y1, y2, value } = dimension
  const clearance = value >= 0
  const name = clearance ? names[0] : names[1]
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)
  const middle = (top + bottom) / 2
  const withArrows = bottom - top > 2 * ARROW
  const arrow = (tipY: number, direction: 1 | -1): Segment[] => [
    { x1: x, y1: tipY, x2: x - ARROW_HALF_WIDTH, y2: tipY + direction * ARROW },
    { x1: x, y1: tipY, x2: x + ARROW_HALF_WIDTH, y2: tipY + direction * ARROW },
  ]
  return (
    <g className={clearance ? styles.clearance : styles.interference}>
      <line className={styles.dimension} x1={x} x2={x} y1={top} y2={bottom} />
      {withArrows && [...arrow(top, 1), ...arrow(bottom, -1)].map((segment, i) => <line key={i} className={styles.dimension} {...segment} />)}
      {inline ? (
        <>
          <rect className={styles.labelBackground} x={x - 24} y={middle - 8} width={48} height={14} />
          <text className={cx(styles.dimensionValue, styles.centred)} x={x} y={middle + 3}>
            {name} {valueText}
          </text>
        </>
      ) : (
        <>
          <rect className={styles.labelBackground} x={x + 6} y={middle - 17} width={44} height={36} />
          <text className={styles.dimensionName} x={x + 10} y={middle - 4}>
            {name}
          </text>
          <text className={styles.dimensionValue} x={x + 10} y={middle + 13}>
            {valueText}
          </text>
        </>
      )}
    </g>
  )
}
