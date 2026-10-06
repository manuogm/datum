// Geometry of the joint diagram (force against elongation, VDI 2230-1 Fig. 1)
// at the lowest preload in service FV,min: the bolt line from the origin, the
// clamped parts' line down to separation, and the axial load FA,max split
// into the extra bolt force Φn·FA and the residual clamp load FKR. The parts'
// line is drawn with the slope that makes this split exact for the load
// introduction factor n (the n < 1 diagram reduced to two lines). Forces may
// be in any one unit (the screens pass display units, so the force axis has
// round ticks); positions are in the frame's SVG coordinates.
import { niceAxis, scaleLinear, type Segment } from '../../../../app/charts'

export const JOINT_DIAGRAM_FRAME = { width: 360, height: 300, left: 46, right: 300, top: 24, bottom: 270 } as const

export type JointDiagramFrame = typeof JOINT_DIAGRAM_FRAME

/** Φn is below 1 by definition; this keeps the separation point finite for a degenerate input. */
const MAX_LOAD_FACTOR = 0.99

export interface JointDiagramInput {
  /** δS, elongation per unit force (only its ratio to the forces' scale matters: the elongation axis has no ticks) */
  readonly boltResilience: number
  /** Φn */
  readonly loadFactor: number
  /** FV,min */
  readonly preload: number
  /** FA,max */
  readonly axial: number
}

export interface Point {
  readonly x: number
  readonly y: number
}

export interface JointDiagramLayout {
  readonly forceTicks: readonly { readonly value: number; readonly y: number }[]
  /** Origin to the largest bolt force. */
  readonly bolt: Segment
  /** From the preload point down to separation. */
  readonly parts: Segment
  readonly preload: Point
  /** FA: from the residual clamp load up to the largest bolt force. */
  readonly load: Segment
  /** FKR: from the axis up to the residual clamp load (zero length once the parts separate). */
  readonly residual: Segment
  readonly separation: Point
  readonly forces: {
    readonly preload: number
    /** FV + Φn·FA, or FA once the parts have separated. */
    readonly bolt: number
    readonly residual: number
    /** FA at which the parts separate. */
    readonly separationAxial: number
  }
  readonly separated: boolean
}

export function jointDiagramLayout(input: JointDiagramInput, frame: JointDiagramFrame = JOINT_DIAGRAM_FRAME): JointDiagramLayout {
  const { boltResilience, preload: preloadForce, axial } = input
  const phi = Math.min(Math.max(input.loadFactor, 0), MAX_LOAD_FACTOR)
  const separationAxial = preloadForce / (1 - phi)
  const separated = axial >= separationAxial
  const boltForce = separated ? axial : preloadForce + phi * axial
  const residualForce = separated ? 0 : preloadForce - (1 - phi) * axial
  // Every point of the bolt line is at elongation F·δS; separation is where the parts' line meets the axis.
  const elongation = (force: number) => force * boltResilience
  const forceAxis = niceAxis([0, boltForce, preloadForce], 5)
  const x = scaleLinear({ min: 0, max: elongation(Math.max(boltForce, separationAxial)) * 1.08 }, frame.left, frame.right)
  const y = scaleLinear(forceAxis, frame.bottom, frame.top)
  const point = (forceAtX: number, force: number): Point => ({ x: x(elongation(forceAtX)), y: y(force) })
  const top = point(boltForce, boltForce)
  const preload = point(preloadForce, preloadForce)
  const separation = point(separationAxial, 0)
  const residual = point(boltForce, residualForce)
  return {
    forceTicks: forceAxis.ticks.map((value) => ({ value, y: y(value) })),
    bolt: { x1: x(0), y1: y(0), x2: top.x, y2: top.y },
    parts: { x1: preload.x, y1: preload.y, x2: separation.x, y2: separation.y },
    preload,
    load: { x1: residual.x, y1: residual.y, x2: top.x, y2: top.y },
    residual: { x1: residual.x, y1: y(0), x2: residual.x, y2: residual.y },
    separation,
    forces: { preload: preloadForce, bolt: boltForce, residual: residualForce, separationAxial },
    separated,
  }
}
