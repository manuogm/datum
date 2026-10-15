// Everything the engineer enters in the Tolerance Stack-up tool. Lengths
// are in mm. This record is what a calculation in the library stores; the
// engine's input is built from it (logic/engineInput.ts).
//
// Two things keep the 3D path open (engine notes §9): every row carries a
// sensitivity coefficient, a number (±1 in a 1D loop, ±½ for half a size),
// never a sign; and a nominal is a magnitude, its direction is separate.
//
// A value not entered yet is null (a new row starts empty), so the engine
// can say which row needs what. Inputs of a modifier that is switched off
// are kept, so switching it on again brings them back.
import type {
  DrawingStandard, FeatureType, GeometricCharacteristic, MaterialBoundary, MaterialCondition, StackMethod, StackResult,
} from '../../calc'

/** Part: one dimension on one part, through its features. Assembly: a gap through several parts, using their part stacks. */
export type StackMode = 'part' | 'assembly'

/** The limits of a toleranced feature of size (hole or pin), for a bonus tolerance or a datum shift. */
export interface FeatureSize {
  readonly type: FeatureType
  readonly min: number | null
  readonly max: number | null
}

/** One datum cell of the frame; an empty letter is an unused cell. */
export interface DatumCell {
  readonly letter: string
  readonly modifier: MaterialBoundary
  /** The datum feature's size, for the shift at MMB / LMB. */
  readonly feature: FeatureSize
  /** Its own geometric tolerance at MMC (puts its MMB at virtual condition); null: none. */
  readonly boundaryAllowance: number | null
}

/**
 * A feature control frame, as entered. Ⓤ: `value` is the ASME Ⓤ value,
 * the share of the zone on the side that adds material (an ISO UZ offset v
 * is entered as v and stored as zone/2 + v).
 */
export interface GeometricEntry {
  readonly kind: 'geometric'
  readonly characteristic: GeometricCharacteristic
  readonly zone: number | null
  readonly diameterZone: boolean
  readonly materialCondition: MaterialCondition
  readonly feature: FeatureSize
  /** Always three cells: primary, secondary, tertiary. */
  readonly datums: readonly DatumCell[]
  readonly unequal: { readonly on: boolean; readonly value: number | null; readonly materialSide: 'larger' | 'smaller' }
  readonly projected: { readonly on: boolean; readonly height: number | null }
  readonly freeState: boolean
  readonly tangentPlane: boolean
  readonly commonZone: boolean
}

/** A row's tolerance: ± t, deviations +a/−b (signed, ISO 286 style), limits, or a geometric tolerance. */
export type ToleranceEntry =
  | { readonly kind: 'symmetric'; readonly plusMinus: number | null }
  | { readonly kind: 'deviations'; readonly upper: number | null; readonly lower: number | null }
  | { readonly kind: 'limits'; readonly min: number | null; readonly max: number | null }
  | GeometricEntry

export type ToleranceKind = ToleranceEntry['kind']

/** A dimension of the chain, typed here (both modes). */
export interface DimensionRow {
  readonly kind: 'dimension'
  /** Stable within the chain: keeps a row's place on screen while rows move. */
  readonly id: string
  readonly label: string
  /** a_i = ∂result/∂x_i: +1 adds, −1 subtracts, ±0.5 counts half of it. */
  readonly sensitivity: number
  /** The dimension on the drawing as a magnitude (the basic dimension for a geometric row; 0 for a form or orientation row). */
  readonly nominal: number | null
  readonly tolerance: ToleranceEntry
  /** ⟨ST⟩ statistical tolerance. */
  readonly statistical: boolean
  /** Where it comes from, e.g. "drawing 1043-B, zone C4" (shown in the report). */
  readonly source: string
}

/**
 * A saved Part stack as the assembly last saved it: the result it used and
 * the names to show. It stands in when the link breaks (the part is deleted,
 * switched to Assembly, or its chain fails), and shows what changed when
 * the part is saved again.
 */
export interface LinkSnapshot {
  readonly stack: StackResult
  readonly partName: string
  readonly resultName: string
  readonly calculationName: string
  readonly folderName: string
  /** The part calculation's "last saved" time when this was taken. */
  readonly updatedAt: string
}

/** Assembly mode: a saved Part-mode stack of the library, as one row. */
export interface LinkedRow {
  readonly kind: 'linked'
  readonly id: string
  readonly sensitivity: number
  readonly calcId: string
  readonly last: LinkSnapshot
}

export type StackRow = DimensionRow | LinkedRow

export interface StackInputs {
  readonly mode: StackMode
  /** Part mode: the part, e.g. "Housing"; it names the part when an assembly links it. */
  readonly partName: string
  /** The dimension or gap the stack adds up to, e.g. "Shoulder to circlip groove", "Bearing end play". */
  readonly resultName: string
  /** Smallest and largest allowed result, mm; null: no limit on that side. */
  readonly requirement: { readonly min: number | null; readonly max: number | null }
  /** The method the verdict uses (both are always worked out). */
  readonly method: StackMethod
  readonly standard: DrawingStandard
  /** Optional names of the loop's two ends, e.g. "face A", "circlip flank". */
  readonly startLabel: string
  readonly endLabel: string
  /** The chain in loop order. */
  readonly rows: readonly StackRow[]
}

const EMPTY_FEATURE: FeatureSize = { type: 'internal', min: null, max: null }

export const emptyDatum = (letter = ''): DatumCell => ({ letter, modifier: 'rmb', feature: EMPTY_FEATURE, boundaryAllowance: null })

/** A geometric tolerance with nothing entered yet but its characteristic (position, unless given). */
export function newGeometric(characteristic: GeometricCharacteristic = 'position', zone: number | null = null): GeometricEntry {
  return {
    kind: 'geometric', characteristic, zone, diameterZone: false, materialCondition: 'rfs', feature: EMPTY_FEATURE,
    datums: [emptyDatum(), emptyDatum(), emptyDatum()],
    unequal: { on: false, value: null, materialSide: 'larger' },
    projected: { on: false, height: null },
    freeState: false, tangentPlane: false, commonZone: false,
  }
}

/** A new dimension row: adds, ± tolerance, nothing entered. */
export function newDimension(id: string, tolerance: ToleranceEntry = { kind: 'symmetric', plusMinus: null }): DimensionRow {
  return { kind: 'dimension', id, label: '', sensitivity: 1, nominal: null, tolerance, statistical: false, source: '' }
}

/** Where a new calculation starts: a Part stack with an empty chain and no requirement. */
export const NEW_STACK_INPUTS: StackInputs = {
  mode: 'part',
  partName: '',
  resultName: '',
  requirement: { min: null, max: null },
  method: 'worst-case',
  standard: 'iso',
  startLabel: '',
  endLabel: '',
  rows: [],
}

/**
 * The seeded Part example (engine notes §8, HOUSING_PART_STACK): the bearing
 * seat of a housing, from the shoulder to the outer flank of the circlip
 * groove, dimensioned from the open end face A. It is stored without
 * inputs, so it opens on these.
 */
export const EXAMPLE_STACK_INPUTS: StackInputs = {
  ...NEW_STACK_INPUTS,
  partName: 'Housing',
  resultName: 'Shoulder to circlip groove',
  requirement: { min: 20.8, max: 21.1 },
  rows: [
    { ...newDimension('r1', { kind: 'symmetric', plusMinus: 0.05 }), label: 'Shoulder depth from face A', nominal: 42 },
    {
      ...newDimension('r2', { ...newGeometric('position', 0.1), datums: [emptyDatum('A'), emptyDatum(), emptyDatum()] }),
      label: 'Groove centre from face A (position 0.1 to A)', sensitivity: -1, nominal: 22,
    },
    { ...newDimension('r3', { kind: 'deviations', upper: 0.07, lower: 0 }), label: 'Half groove width (1.85 +0.14/0)', nominal: 0.925 },
  ],
}
