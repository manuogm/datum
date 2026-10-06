// Layout of the exploded ply stack: each ply a square drawn in isometric
// view, top ply highest, spread over the frame however many plies there are.
// Fibre lines are drawn in the ply's own plane, so a +45° ply shows them at
// +45° from the x arrow. Coordinates are SVG units of STACK_FRAME.
import { normaliseAngleDeg } from '../../calc'

export const STACK_FRAME = { width: 420, height: 480 } as const

/** Half the side of a ply square before projection. */
export const PLY_HALF_SIDE = 64
/** Ply plane → screen: x runs down to the right, y up to the right (seen from above). */
export const PLY_PROJECTION = 'matrix(0.866,0.35,-0.866,0.35,0,0)'

const CENTRE_X = 170
const FIRST_Y = 64
const LAST_Y = 400
const MAX_SPACING = 48
/** Closest two ply labels may sit. */
const LABEL_SPACING = 14
export const LEADER = { x1: 282, x2: 318, labelX: 324 } as const
export const X_ARROW = { x1: 40, y1: 452, x2: 74, y2: 472, head: '80,475 70,474 74,467', labelX: 84, labelY: 476 } as const

export interface StackPly {
  /** 1 = top ply. */
  readonly index: number
  readonly angleDeg: number
  /** Centre of the ply on screen. */
  readonly cy: number
  /** Translate to the centre, then project the ply plane. */
  readonly transform: string
  /** Whether its number and angle are written beside it (not all fit in a thick laminate). */
  readonly labelled: boolean
  readonly critical: boolean
}

/** Plies in drawing order, bottom ply first so the top ply is drawn over the others. */
export function stackLayout(anglesDeg: readonly number[], criticalPlies: readonly number[]): StackPly[] {
  const count = anglesDeg.length
  const spacing = count > 1 ? Math.min(MAX_SPACING, (LAST_Y - FIRST_Y) / (count - 1)) : 0
  const start = FIRST_Y + (LAST_Y - FIRST_Y - spacing * (count - 1)) / 2
  const every = Math.max(1, Math.ceil(LABEL_SPACING / Math.max(spacing, 1e-9)))
  return anglesDeg
    .map((angleDeg, i) => {
      const index = i + 1
      const cy = start + i * spacing
      const critical = criticalPlies.includes(index)
      return {
        index,
        angleDeg,
        cy,
        transform: `translate(${CENTRE_X},${cy}) ${PLY_PROJECTION}`,
        labelled: critical || i % every === 0 || i === count - 1,
        critical,
      }
    })
    .reverse()
}

/** The fibre direction as an SVG rotation of the ply plane: rotate(−θ), since the plane's SVG y axis is the laminate's −y. */
export const fibreRotation = (angleDeg: number) => `rotate(${-normaliseAngleDeg(angleDeg)})`

/** The distinct ply angles, for one hatch pattern each. */
export const distinctAngles = (anglesDeg: readonly number[]): number[] => [...new Set(anglesDeg.map(normaliseAngleDeg))]
