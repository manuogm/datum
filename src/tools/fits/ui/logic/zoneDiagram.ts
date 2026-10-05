// Geometry of the tolerance zone diagram: the hole and shaft zones drawn to
// scale against the zero line (the nominal size), with the dimension lines
// for the minimum and maximum clearance. Values come in display units (µm or
// thou); positions are SVG coordinates of the chosen frame (screen or report).
import type { Rect, Segment } from './geometry'
import { niceAxis, scaleLinear } from './scale'

export interface ZoneDiagramFrame {
  readonly width: number
  readonly height: number
  /** Grid lines run from left to right; tick labels sit left of `left`. */
  readonly left: number
  readonly right: number
  readonly valueTop: number
  readonly valueBottom: number
  readonly holeX: number
  readonly shaftX: number
  readonly zoneWidth: number
  /** x of the min / max clearance dimension lines. */
  readonly minDimensionX: number
  readonly maxDimensionX: number
  readonly maxTicks: number
  /** Zones at least this tall show their name inside. */
  readonly nameInsideMinHeight: number
}

export const SCREEN_FRAME: ZoneDiagramFrame = {
  width: 700, height: 470, left: 70, right: 690, valueTop: 50, valueBottom: 420,
  holeX: 190, shaftX: 380, zoneWidth: 140, minDimensionX: 560, maxDimensionX: 620, maxTicks: 12, nameInsideMinHeight: 48,
}

export const REPORT_FRAME: ZoneDiagramFrame = {
  width: 400, height: 215, left: 40, right: 390, valueTop: 22, valueBottom: 178,
  holeX: 100, shaftX: 210, zoneWidth: 90, minDimensionX: 320, maxDimensionX: 364, maxTicks: 6, nameInsideMinHeight: 22,
}

/** Upper and lower limit deviations of a zone (ES/EI or es/ei). */
export interface ZoneLimits {
  readonly upper: number
  readonly lower: number
}

export interface DiagramZone extends Rect {
  readonly nameInside: boolean
  /** Baselines for the upper and lower deviation labels, kept apart on thin zones. */
  readonly upperLabelY: number
  readonly lowerLabelY: number
}

export interface Dimension {
  readonly x: number
  /** From the hole edge to the shaft edge. */
  readonly y1: number
  readonly y2: number
  /** Hole − shaft: positive is clearance, negative interference. */
  readonly value: number
}

export interface ZoneDiagramLayout {
  readonly ticks: readonly { readonly value: number; readonly y: number }[]
  readonly zeroY: number
  readonly hole: DiagramZone
  readonly shaft: DiagramZone
  /** EI − es */
  readonly minDimension: Dimension
  /** ES − ei */
  readonly maxDimension: Dimension
  /** Dashed lines carrying the zone edges out to the dimension lines. */
  readonly extensions: readonly Segment[]
}

const MIN_ZONE_HEIGHT = 2
const LABEL_INSET = 4
const THIN_ZONE_HEIGHT = 16

export function zoneDiagramLayout(hole: ZoneLimits, shaft: ZoneLimits, frame: ZoneDiagramFrame): ZoneDiagramLayout {
  const axis = niceAxis([0, hole.upper, hole.lower, shaft.upper, shaft.lower], frame.maxTicks)
  const y = scaleLinear(axis, frame.valueBottom, frame.valueTop)
  const holeZone = zoneRect(hole, frame.holeX, frame, y)
  const shaftZone = zoneRect(shaft, frame.shaftX, frame, y)
  const holeRight = frame.holeX + frame.zoneWidth
  const shaftRight = frame.shaftX + frame.zoneWidth
  const reach = 10
  return {
    ticks: axis.ticks.map((value) => ({ value, y: y(value) })),
    zeroY: y(0),
    hole: holeZone,
    shaft: shaftZone,
    minDimension: { x: frame.minDimensionX, y1: y(hole.lower), y2: y(shaft.upper), value: hole.lower - shaft.upper },
    maxDimension: { x: frame.maxDimensionX, y1: y(hole.upper), y2: y(shaft.lower), value: hole.upper - shaft.lower },
    extensions: [
      { x1: holeRight, y1: y(hole.upper), x2: frame.maxDimensionX + reach, y2: y(hole.upper) },
      { x1: shaftRight, y1: y(shaft.lower), x2: frame.maxDimensionX + reach, y2: y(shaft.lower) },
      { x1: holeRight, y1: y(hole.lower), x2: frame.minDimensionX + reach, y2: y(hole.lower) },
      { x1: shaftRight, y1: y(shaft.upper), x2: frame.minDimensionX + reach, y2: y(shaft.upper) },
    ],
  }
}

function zoneRect(limits: ZoneLimits, x: number, frame: ZoneDiagramFrame, y: (value: number) => number): DiagramZone {
  const top = y(limits.upper)
  const height = Math.max(y(limits.lower) - top, MIN_ZONE_HEIGHT)
  const bottom = top + height
  const thin = height < THIN_ZONE_HEIGHT
  return {
    x,
    y: top,
    width: frame.zoneWidth,
    height,
    nameInside: height >= frame.nameInsideMinHeight,
    upperLabelY: thin ? top - 3 : top + LABEL_INSET,
    lowerLabelY: thin ? bottom + 11 : bottom - LABEL_INSET,
  }
}
