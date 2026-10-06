// Layout of the through-thickness plot: the laminate's height z upwards (top
// ply at the top), and for each ply the chosen stress, strain or failure
// index from its top face to its bottom face. Under bending the value changes
// across a ply, so each ply is drawn as a trapezoid. Values arrive in display
// units; coordinates are SVG units of THICKNESS_FRAME.
import { niceAxis, scaleLinear } from '../../../../app/charts'
import type { Status } from '../../../../app/ui'
import { toDisplay, unitOf, type UnitSystem } from '../../../../core/units'
import type { PointResponse } from '../../calc'

export const THICKNESS_FRAME = { width: 300, height: 470, left: 64, right: 272, top: 40, bottom: 400 } as const

/** Plies thinner than this on screen get no value label. */
const MIN_LABELLED_HEIGHT = 11

export type PlotComponent = 'sx' | 's1' | 's2' | 't12' | 'ex' | 'fi'

export const PLOT_COMPONENTS: readonly { readonly value: PlotComponent; readonly label: string }[] = [
  { value: 'sx', label: 'σx' },
  { value: 's1', label: 'σ1' },
  { value: 's2', label: 'σ2' },
  { value: 't12', label: 'τ12' },
  { value: 'ex', label: 'εx' },
  { value: 'fi', label: 'FI' },
]

/** The component at one point, in display units: stresses in MPa or ksi, strain in %. */
export function pointValue(point: PointResponse, component: PlotComponent, system: UnitSystem): number {
  const stress = (mpa: number) => toDisplay('strength', system, mpa)
  switch (component) {
    case 'sx':
      return stress(point.stressGlobalMPa[0])
    case 's1':
      return stress(point.stressMaterialMPa[0])
    case 's2':
      return stress(point.stressMaterialMPa[1])
    case 't12':
      return stress(point.stressMaterialMPa[2])
    case 'ex':
      return point.strainGlobal[0] * 100
    case 'fi':
      return point.failureIndex
  }
}

export function componentUnit(component: PlotComponent, system: UnitSystem): string {
  if (component === 'ex') return '%'
  return component === 'fi' ? '' : unitOf('strength', system)
}

export interface ThicknessPly {
  readonly index: number
  readonly zTopMm: number
  readonly zBottomMm: number
  /** Values at the top and bottom face, in display units. */
  readonly top: number
  readonly bottom: number
  readonly tone: Status
}

export interface ThicknessBar {
  readonly index: number
  readonly points: string
  readonly tone: Status
  /** The larger of the face values, written beside the ply when it is tall enough. */
  readonly label: { readonly value: number; readonly x: number; readonly y: number; readonly anchor: 'start' | 'end' } | null
}

export interface ThicknessLayout {
  readonly bars: readonly ThicknessBar[]
  readonly zTicks: readonly { readonly y: number; readonly zMm: number }[]
  readonly valueTicks: readonly { readonly x: number; readonly value: number }[]
  readonly zeroX: number
  readonly midplaneY: number
  /** Vertical lines at given values, e.g. FI 1 (failure) and 1/RF target. */
  readonly references: readonly { readonly x: number; readonly value: number }[]
}

export function thicknessLayout(plies: readonly ThicknessPly[], thicknessMm: number, references: readonly number[] = []): ThicknessLayout {
  const { left, right, top, bottom } = THICKNESS_FRAME
  const values = plies.flatMap((p) => [p.top, p.bottom])
  const axis = niceAxis([0, ...values, ...references], 4)
  const x = scaleLinear(axis, left, right)
  const y = scaleLinear({ min: thicknessMm / 2, max: -thicknessMm / 2 }, top, bottom)
  const bars = plies.map((ply): ThicknessBar => {
    const [yTop, yBottom] = [y(ply.zTopMm), y(ply.zBottomMm)]
    const [xTop, xBottom] = [x(ply.top), x(ply.bottom)]
    const larger = Math.abs(ply.bottom) > Math.abs(ply.top) ? ply.bottom : ply.top
    const negative = larger < 0
    const edge = negative ? Math.min(xTop, xBottom) : Math.max(xTop, xBottom)
    return {
      index: ply.index,
      points: [[x(0), yTop], [xTop, yTop], [xBottom, yBottom], [x(0), yBottom]].map(([px, py]) => `${px},${py}`).join(' '),
      tone: ply.tone,
      label: yBottom - yTop >= MIN_LABELLED_HEIGHT
        ? { value: larger, x: edge + (negative ? -4 : 4), y: (yTop + yBottom) / 2 + 3.5, anchor: negative ? 'end' : 'start' }
        : null,
    }
  })
  return {
    bars,
    zTicks: [thicknessMm / 2, 0, -thicknessMm / 2].map((zMm) => ({ y: y(zMm), zMm })),
    valueTicks: axis.ticks.map((value) => ({ x: x(value), value })),
    zeroX: x(0),
    midplaneY: y(0),
    references: references.map((value) => ({ x: x(value), value })),
  }
}
