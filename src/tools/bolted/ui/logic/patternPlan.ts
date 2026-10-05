// Geometry of the bolt pattern's plan view: the plate outline around the
// bolts, each bolt at its position (sized by its thread), the transverse
// force on it as an arrow to a common scale, the centroid with its axes and
// the load point with the in-plane force. Positions are in mm with y up;
// forces in any one unit (the screens pass display units, so the shear
// legend is a round force). The layout returns the frame's SVG coordinates
// (y down).
import { niceStep, type Rect, type Segment } from '../../../../app/charts'
import { boltLoads, loadAtCentroid, patternProperties } from '../../pattern'
import type { LoadCaseSpec, PatternSpec } from '../state/boltInputs'
import type { Point } from './jointDiagram'

export const PLAN_FRAME = { width: 600, height: 440, padding: 56 } as const

export type PlanFrame = typeof PLAN_FRAME

/** Plate edge beyond the outermost bolt centres, at least this many mm or this many bolt diameters. */
const EDGE_MM = 18
const EDGE_DIAMETERS = 2.2
/** Bolt symbol radius in px: a base plus a share of d, so an M12 reads larger than an M4. */
const BOLT_RADIUS_PX = 7
const BOLT_RADIUS_PX_PER_MM = 0.6
const LONGEST_SHEAR_PX = 46
const FORCE_ARROW_PX = 40
const PLATE_CORNER_PX = 22

export interface PlanBoltInput {
  readonly id: string
  readonly xMm: number
  readonly yMm: number
  readonly nominalMm: number
  readonly shearX: number
  readonly shearY: number
}

export interface PlanInput {
  readonly bolts: readonly PlanBoltInput[]
  readonly centroidMm: { readonly x: number; readonly y: number }
  readonly loadPointMm: { readonly x: number; readonly y: number }
  readonly inPlaneForce: { readonly x: number; readonly y: number }
}

export interface PlanBolt {
  readonly id: string
  readonly centre: Point
  readonly radius: number
  /** Transverse force, from the bolt's edge; null when too small to draw. */
  readonly shear: Segment | null
}

export interface PlanLayout {
  readonly plate: Rect & { readonly corner: number }
  readonly bolts: readonly PlanBolt[]
  readonly centroid: Point
  /** Dash-dot axes through the centroid, a little beyond the plate. */
  readonly axes: readonly [Segment, Segment]
  readonly loadPoint: Point
  /** The in-plane force at the load point (direction only); null without one. */
  readonly force: Segment | null
  /** Legend of the shear arrows: an arrow of `lengthPx` is `force`; null when no bolt carries shear. */
  readonly shearScale: { readonly force: number; readonly lengthPx: number } | null
}

/**
 * The plan of a pattern under a load case. The bolt forces come from the
 * pattern engine's load sharing, which does not need the joint types, so the
 * plan shows them even while a joint type cannot be analysed.
 */
export function planInputOf(pattern: PatternSpec, loadCase: LoadCaseSpec): PlanInput {
  const properties = patternProperties(pattern.bolts)
  const loads = boltLoads(pattern.bolts, properties, loadAtCentroid(loadCase, properties.centroidMm))
  const nominalMm = (jointTypeId: string) => pattern.jointTypes.find((j) => j.id === jointTypeId)?.design.thread.nominalMm ?? 0
  return {
    bolts: pattern.bolts.map((bolt, i) => ({
      id: bolt.id,
      xMm: bolt.xMm,
      yMm: bolt.yMm,
      nominalMm: nominalMm(bolt.jointTypeId),
      shearX: loads.ok ? loads.value[i].shearXN : 0,
      shearY: loads.ok ? loads.value[i].shearYN : 0,
    })),
    centroidMm: properties.centroidMm,
    loadPointMm: loadCase.loadPointMm,
    inPlaneForce: loadCase.forceN,
  }
}

export function planLayout(input: PlanInput, frame: PlanFrame = PLAN_FRAME): PlanLayout {
  const xs = input.bolts.map((b) => b.xMm)
  const ys = input.bolts.map((b) => b.yMm)
  const edge = Math.max(EDGE_MM, EDGE_DIAMETERS * Math.max(...input.bolts.map((b) => b.nominalMm)))
  const [minX, maxX, minY, maxY] = [Math.min(...xs) - edge, Math.max(...xs) + edge, Math.min(...ys) - edge, Math.max(...ys) + edge]
  const scale = Math.min((frame.width - 2 * frame.padding) / (maxX - minX), (frame.height - 2 * frame.padding) / (maxY - minY))
  const originX = frame.width / 2 - ((minX + maxX) / 2) * scale
  const originY = frame.height / 2 + ((minY + maxY) / 2) * scale
  const at = (xMm: number, yMm: number): Point => ({ x: originX + xMm * scale, y: originY - yMm * scale })

  const plateTopLeft = at(minX, maxY)
  const plate = { x: plateTopLeft.x, y: plateTopLeft.y, width: (maxX - minX) * scale, height: (maxY - minY) * scale, corner: PLATE_CORNER_PX }
  const longest = Math.max(...input.bolts.map((b) => Math.hypot(b.shearX, b.shearY)))
  const pxPerForce = longest > 0 ? LONGEST_SHEAR_PX / longest : 0
  const centroid = at(input.centroidMm.x, input.centroidMm.y)
  const loadPoint = at(input.loadPointMm.x, input.loadPointMm.y)
  const overhang = 20
  const shearScale = longest > 0 ? niceStep(longest, 2) : null

  return {
    plate,
    bolts: input.bolts.map((b) => {
      const centre = at(b.xMm, b.yMm)
      const radius = BOLT_RADIUS_PX + BOLT_RADIUS_PX_PER_MM * b.nominalMm
      return { id: b.id, centre, radius, shear: arrowFrom(centre, b.shearX, -b.shearY, radius, Math.hypot(b.shearX, b.shearY) * pxPerForce) }
    }),
    centroid,
    axes: [
      { x1: plate.x - overhang, y1: centroid.y, x2: plate.x + plate.width + overhang, y2: centroid.y },
      { x1: centroid.x, y1: plate.y - overhang, x2: centroid.x, y2: plate.y + plate.height + overhang },
    ],
    loadPoint,
    force: arrowFrom(loadPoint, input.inPlaneForce.x, -input.inPlaneForce.y, 0, FORCE_ARROW_PX),
    shearScale: shearScale === null ? null : { force: shearScale, lengthPx: shearScale * pxPerForce },
  }
}

/** An arrow of `length` px along (dx, dy) in SVG axes, starting `offset` px from `from`; null when shorter than 2 px or without direction. */
function arrowFrom(from: Point, dx: number, dy: number, offset: number, length: number): Segment | null {
  const norm = Math.hypot(dx, dy)
  if (norm === 0 || length < 2) return null
  const [ux, uy] = [dx / norm, dy / norm]
  return { x1: from.x + ux * offset, y1: from.y + uy * offset, x2: from.x + ux * (offset + length), y2: from.y + uy * (offset + length) }
}
