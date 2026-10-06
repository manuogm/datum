// Geometry of the joint section A–A, drawn to scale from the analysis: the
// bolt, the washers, the clamped plates (by material family), the nut or the
// tapped part (with the insert, if any) and the VDI 2230 pressure cone at the
// engine's cone angle, cut off at the outer diameter DA. The head and nut
// heights are not part of the analysis: they are drawn in typical ISO
// proportions of d, as noted below. Positions are in the frame's SVG
// coordinates, the bolt axis vertical.
import type { Rect, Segment } from '../../../../app/charts'
import type { MaterialFamily } from '../../../../core/materials'
import type { BoltedJointAnalysis } from '../../calc'
import type { JointDesignSpec } from '../state/boltInputs'
import type { Point } from './jointDiagram'
import { materialFamily } from './labels'

export const SECTION_FRAME = { width: 280, height: 340, margin: 34 } as const

export type SectionFrame = typeof SECTION_FRAME

/** Typical proportions of d, for the drawing only: ISO 4017 hexagon head k ≈ 0.7d, ISO 4762 socket head k = d, ISO 4032 nut m ≈ 0.85d. */
const HEAD_HEIGHT = { hex: 0.7, socket: 1 } as const
const NUT_HEIGHT = 0.85
/** Bolt end beyond the nut, and the tapped part's material below the bolt end, as shares of d. */
const BOLT_PROTRUSION = 0.3
const BLIND_DEPTH = 0.5
/** Head and nut drawn a little wider than their bearing diameter dW, as the corners of a hexagon are. */
const ACROSS_CORNERS = 1.12

export type SectionJoint =
  | { readonly kind: 'through-bolt'; readonly nutBearingMm: number }
  | { readonly kind: 'tapped'; readonly engagementMm: number; readonly family: MaterialFamily }
  | { readonly kind: 'insert'; readonly engagementMm: number; readonly family: MaterialFamily; readonly insertDiameterMm: number }

export interface SectionInput {
  readonly nominalMm: number
  readonly headType: 'hex' | 'socket'
  readonly headBearingMm: number
  readonly clearanceHoleMm: number
  readonly washer: { readonly outerMm: number; readonly thicknessMm: number } | null
  readonly plates: readonly { readonly thicknessMm: number; readonly family: MaterialFamily }[]
  readonly outerDiameterMm: number
  readonly coneAngleDeg: number
  readonly joint: SectionJoint
}

export interface SectionPart {
  readonly rect: Rect
  readonly family: MaterialFamily
}

export interface SectionLayout {
  readonly head: Rect
  readonly nut: Rect | null
  readonly shank: Rect
  readonly washers: readonly Rect[]
  /** Clamped plates, then the tapped part if any. */
  readonly parts: readonly SectionPart[]
  /** The clearance hole through the clamped plates. */
  readonly hole: Rect
  /** Thread of the tapped part or insert band: the bolt's engagement. */
  readonly engagement: Rect | null
  readonly insert: Rect | null
  /** Left and right halves of the pressure cone. */
  readonly cone: readonly (readonly Point[])[]
  readonly axis: Segment
  /** FA arrows (tail to tip) above the head and below the joint; FQ arrows on the first and last part. */
  readonly arrows: { readonly axialTop: Segment; readonly axialBottom: Segment; readonly shearTop: Segment; readonly shearBottom: Segment }
}

const ARROW_LENGTH = 26

/** The section of an analysed joint. */
export function sectionInputOf({ geometry, resilience, engagement }: BoltedJointAnalysis, design: JointDesignSpec): SectionInput {
  const { joint } = design
  const sectionJoint = (): SectionJoint => {
    if (joint.kind === 'through-bolt') return { kind: 'through-bolt', nutBearingMm: geometry.nutBearingMm ?? geometry.headBearingMm }
    const part = { engagementMm: joint.engagementMm, family: materialFamily(joint.materialId) }
    if (joint.kind === 'tapped') return { kind: 'tapped', ...part }
    return { kind: 'insert', ...part, insertDiameterMm: engagement?.outerThread?.nominalMm ?? joint.outerThread?.nominalMm ?? design.thread.nominalMm }
  }
  return {
    nominalMm: design.thread.nominalMm,
    headType: design.headType,
    headBearingMm: geometry.headBearingMm,
    clearanceHoleMm: geometry.clearanceHoleMm,
    washer: geometry.washer,
    plates: design.plates.map((p) => ({ thicknessMm: p.thicknessMm, family: materialFamily(p.materialId) })),
    outerDiameterMm: design.outerDiameterMm,
    coneAngleDeg: resilience.coneAngleDeg,
    joint: sectionJoint(),
  }
}

export function sectionLayout(input: SectionInput, frame: SectionFrame = SECTION_FRAME): SectionLayout {
  const d = input.nominalMm
  const { joint } = input
  const headHeight = HEAD_HEIGHT[input.headType] * d
  const washerHeight = input.washer?.thicknessMm ?? 0
  const clampTop = headHeight + washerHeight
  const clampedMm = input.plates.reduce((sum, p) => sum + p.thicknessMm, 0)
  const clampBottom = clampTop + clampedMm
  const below = joint.kind === 'through-bolt' ? washerHeight + NUT_HEIGHT * d : joint.engagementMm + BLIND_DEPTH * d
  const totalMm = clampBottom + below + (joint.kind === 'through-bolt' ? BOLT_PROTRUSION * d : 0)
  const headWidth = input.headBearingMm * ACROSS_CORNERS
  const widthMm = Math.max(input.outerDiameterMm, headWidth, input.washer?.outerMm ?? 0)

  const scale = Math.min((frame.width - 2 * frame.margin) / widthMm, (frame.height - 2 * frame.margin) / totalMm)
  const axisX = frame.width / 2
  const top = (frame.height - totalMm * scale) / 2
  /** A rect centred on the bolt axis, from depth y (mm below the head top). */
  const centred = (widthMm: number, yMm: number, heightMm: number): Rect => ({
    x: axisX - (widthMm * scale) / 2, y: top + yMm * scale, width: widthMm * scale, height: heightMm * scale,
  })
  const point = (radiusMm: number, yMm: number): Point => ({ x: axisX + radiusMm * scale, y: top + yMm * scale })

  const plates: SectionPart[] = []
  let y = clampTop
  for (const plate of input.plates) {
    plates.push({ rect: centred(input.outerDiameterMm, y, plate.thicknessMm), family: plate.family })
    y += plate.thicknessMm
  }
  const washers = input.washer
    ? [centred(input.washer.outerMm, headHeight, washerHeight), ...(joint.kind === 'through-bolt' ? [centred(input.washer.outerMm, clampBottom, washerHeight)] : [])]
    : []
  const boltEnd = joint.kind === 'through-bolt' ? totalMm : clampBottom + joint.engagementMm
  const tappedPart = joint.kind === 'through-bolt' ? [] : [{ rect: centred(input.outerDiameterMm, clampBottom, below), family: joint.family }]
  const coneRight = coneOutline(input, clampTop, clampBottom).map(([r, yMm]) => point(r, yMm))
  const coneLeft = coneRight.map((p) => ({ x: 2 * axisX - p.x, y: p.y }))
  const first = plates[0].rect
  const last = [...plates, ...tappedPart][plates.length + tappedPart.length - 1].rect
  const middle = (rect: Rect) => rect.y + rect.height / 2
  const bottomY = top + totalMm * scale

  return {
    head: centred(headWidth, 0, headHeight),
    nut: joint.kind === 'through-bolt' ? centred(joint.nutBearingMm * ACROSS_CORNERS, clampBottom + washerHeight, NUT_HEIGHT * d) : null,
    shank: centred(d, headHeight, boltEnd - headHeight),
    washers,
    parts: [...plates, ...tappedPart],
    hole: centred(input.clearanceHoleMm, clampTop, clampedMm),
    engagement: joint.kind === 'through-bolt' ? null : centred(d, clampBottom, joint.engagementMm),
    insert: joint.kind === 'insert' ? centred(joint.insertDiameterMm, clampBottom, joint.engagementMm) : null,
    cone: [coneLeft, coneRight],
    axis: { x1: axisX, y1: top - 8, x2: axisX, y2: bottomY + 8 },
    arrows: {
      axialTop: { x1: axisX, y1: top - 4, x2: axisX, y2: top - 4 - ARROW_LENGTH },
      axialBottom: { x1: axisX, y1: bottomY + 4, x2: axisX, y2: bottomY + 4 + ARROW_LENGTH },
      shearTop: { x1: first.x - ARROW_LENGTH - 4, y1: middle(first), x2: first.x - 4, y2: middle(first) },
      shearBottom: { x1: last.x + last.width + ARROW_LENGTH + 4, y1: middle(last), x2: last.x + last.width + 4, y2: middle(last) },
    },
  }
}

/**
 * Right half of the pressure cone as [radius, depth] in mm: from the head's
 * bearing ring, widening at the cone angle and cut off at DA/2. A through-bolt
 * has a second cone from the nut, meeting the first half-way; in a tapped
 * joint the cone runs the whole clamp length (VDI 2230-1 §5.1.2.2, w = 2).
 */
function coneOutline(input: SectionInput, clampTop: number, clampBottom: number): [number, number][] {
  const tan = Math.tan((input.coneAngleDeg * Math.PI) / 180)
  const outer = input.outerDiameterMm / 2
  const inner = input.clearanceHoleMm / 2
  const startRadius = input.headBearingMm / 2
  const length = clampBottom - clampTop
  const reach = input.joint.kind === 'through-bolt' ? length / 2 : length
  const radiusAt = (depth: number) => Math.min(outer, startRadius + depth * tan)
  const cutOff = (outer - startRadius) / tan
  const down: [number, number][] = [[inner, clampTop], [startRadius, clampTop]]
  if (cutOff > 0 && cutOff < reach) down.push([outer, clampTop + cutOff])
  down.push([radiusAt(reach), clampTop + reach])
  if (input.joint.kind !== 'through-bolt') return [...down, [inner, clampBottom]]
  // The nut's cone mirrors the head's about the middle of the clamp length.
  const up = down.slice(0, -1).reverse().map(([r, depth]): [number, number] => [r, clampTop + clampBottom - depth])
  return [...down, ...up]
}
