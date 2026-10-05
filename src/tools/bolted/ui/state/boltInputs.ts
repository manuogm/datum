// Everything the engineer enters in the Bolted Joint tool, in SI units (mm, N,
// N·m, °C), with materials by their Materials Database id. Both modes keep
// their inputs, so switching between a single joint and a bolt pattern loses
// nothing. This record is what a saved revision stores and what the shareable
// URL carries.
import type {
  HeadType, InsertType, LoadIntroductionPosition, LoadVariation, PropertyClass, SurfaceRoughness, TemperatureRangeC,
  ThreadSize, TighteningMethod,
} from '../../calc'
import type { Vector3 } from '../../pattern'

export type BoltMode = 'joint' | 'pattern'

/** One clamped part, from the bolt head down. */
export interface PlateSpec {
  readonly materialId: string
  readonly thicknessMm: number
}

/** What the bolt screws into (see JointType in the engine). */
export type JointKindSpec =
  | { readonly kind: 'through-bolt' }
  | { readonly kind: 'tapped'; readonly materialId: string; readonly engagementMm: number }
  | {
    readonly kind: 'insert'
    readonly insert: InsertType
    readonly materialId: string
    /** Insert length. */
    readonly engagementMm: number
    /**
     * The thread the insert makes in the part, from the insert catalogue.
     * null: not entered; a helical-coil insert then uses the STI thread, a
     * key-locking insert cannot be checked until it is entered.
     */
    readonly outerThread: Required<ThreadSize> | null
  }

/** One joint: the bolt, what it clamps and screws into, and how it is tightened. */
export interface JointDesignSpec {
  readonly thread: Required<ThreadSize>
  readonly propertyClass: PropertyClass
  readonly headType: HeadType
  readonly washers: boolean
  readonly joint: JointKindSpec
  readonly plates: readonly PlateSpec[]
  /** DA: outer diameter of the clamped parts around the bolt. */
  readonly outerDiameterMm: number
  readonly tightening: TighteningMethod
  /** µG, µK, µT: lowest expected friction coefficients. */
  readonly threadFriction: number
  readonly headFriction: number
  readonly interfaceFriction: number
  readonly surfaceRoughness: SurfaceRoughness
  readonly loadIntroduction: LoadIntroductionPosition
}

/** Working loads on a single joint. */
export interface JointLoadSpec {
  readonly axialMaxN: number
  readonly axialMinN: number
  readonly transverseN: number
  readonly transverseVariation: LoadVariation
}

export interface PatternJointTypeSpec {
  /** 'J1', 'J2' … */
  readonly id: string
  readonly design: JointDesignSpec
}

export interface PatternBoltSpec {
  /** 'B1', 'B2' … */
  readonly id: string
  /** Position in the plan view, mm. */
  readonly xMm: number
  readonly yMm: number
  readonly jointTypeId: string
}

/** Forces and moments at a load point, in the pattern's axes (z along the bolts). */
export interface LoadCaseSpec {
  /** 'LC1', 'LC2' … */
  readonly id: string
  /** e.g. 'Braking' */
  readonly name: string
  readonly forceN: Vector3
  readonly momentNm: Vector3
  readonly loadPointMm: Vector3
}

export interface PatternSpec {
  readonly jointTypes: readonly PatternJointTypeSpec[]
  readonly bolts: readonly PatternBoltSpec[]
  readonly loadCases: readonly LoadCaseSpec[]
  /** The load case on screen. */
  readonly loadCaseId: string
}

export interface BoltInputs {
  readonly mode: BoltMode
  /** Service temperature range of every joint (thermal preload change). */
  readonly serviceTempC: TemperatureRangeC
  readonly joint: { readonly design: JointDesignSpec; readonly loads: JointLoadSpec }
  readonly pattern: PatternSpec
}

const ZERO: Vector3 = { x: 0, y: 0, z: 0 }

/** The Bolted Joint design's example: M10 10.9 through-bolt clamping Al 7075-T6 on S355. */
export const DEFAULT_JOINT_DESIGN: JointDesignSpec = {
  thread: { nominalMm: 10, pitchMm: 1.5 },
  propertyClass: '10.9',
  headType: 'hex',
  washers: false,
  joint: { kind: 'through-bolt' },
  plates: [{ materialId: 'al-7075-t6', thicknessMm: 12 }, { materialId: 'steel-s355', thicknessMm: 8 }],
  outerDiameterMm: 30,
  tightening: 'torque-wrench',
  threadFriction: 0.12,
  headFriction: 0.12,
  interfaceFriction: 0.15,
  surfaceRoughness: 'rz-10-to-40',
  loadIntroduction: 'middle',
}

/** Shared by the pattern's joint types: socket head screws into a 7075 upright. */
const PATTERN_DESIGN: JointDesignSpec = {
  ...DEFAULT_JOINT_DESIGN,
  headType: 'socket',
  plates: [{ materialId: 'ti-6al-4v', thicknessMm: 5 }],
  outerDiameterMm: 12,
}

/**
 * The Bolt Pattern design's caliper mount: eight bolts of four joint types.
 * The Keensert's outer thread is left to the engineer: it comes from the
 * insert catalogue.
 */
export const DEFAULT_PATTERN: PatternSpec = {
  jointTypes: [
    {
      id: 'J1',
      design: {
        ...DEFAULT_JOINT_DESIGN, thread: { nominalMm: 12, pitchMm: 1.75 },
        plates: [{ materialId: 'ti-6al-4v', thicknessMm: 10 }, { materialId: 'ti-6al-4v', thicknessMm: 10 }],
      },
    },
    {
      id: 'J2',
      design: {
        ...PATTERN_DESIGN, thread: { nominalMm: 6, pitchMm: 1 }, propertyClass: 'A4-80', outerDiameterMm: 16,
        plates: [{ materialId: 'ti-6al-4v', thicknessMm: 8 }], joint: { kind: 'tapped', materialId: 'ti-6al-4v', engagementMm: 9 },
      },
    },
    {
      id: 'J3',
      design: {
        ...PATTERN_DESIGN, thread: { nominalMm: 4, pitchMm: 0.7 }, propertyClass: '12.9',
        joint: { kind: 'insert', insert: 'helical-coil', materialId: 'al-7075-t6', engagementMm: 6, outerThread: null },
      },
    },
    {
      id: 'J4',
      design: {
        ...PATTERN_DESIGN, thread: { nominalMm: 4, pitchMm: 0.7 }, propertyClass: '12.9',
        joint: { kind: 'insert', insert: 'key-locking', materialId: 'al-7075-t6', engagementMm: 8, outerThread: null },
      },
    },
  ],
  bolts: [
    { id: 'B1', xMm: -60, yMm: -40, jointTypeId: 'J1' },
    { id: 'B2', xMm: 60, yMm: -40, jointTypeId: 'J1' },
    { id: 'B3', xMm: -60, yMm: 40, jointTypeId: 'J3' },
    { id: 'B4', xMm: 60, yMm: 40, jointTypeId: 'J4' },
    { id: 'B5', xMm: 0, yMm: -55, jointTypeId: 'J2' },
    { id: 'B6', xMm: 0, yMm: 55, jointTypeId: 'J2' },
    { id: 'B7', xMm: -95, yMm: 0, jointTypeId: 'J3' },
    { id: 'B8', xMm: 95, yMm: 0, jointTypeId: 'J4' },
  ],
  loadCases: [
    { id: 'LC1', name: 'Static', forceN: { x: 0, y: 0, z: 4_000 }, momentNm: ZERO, loadPointMm: ZERO },
    { id: 'LC2', name: 'Bump', forceN: { x: 0, y: 0, z: 12_000 }, momentNm: { x: 200, y: 0, z: 0 }, loadPointMm: ZERO },
    {
      id: 'LC3', name: 'Braking', forceN: { x: 0, y: 6_000, z: 14_000 }, momentNm: { x: 300, y: 250, z: 400 },
      loadPointMm: { x: 15, y: 10, z: 0 },
    },
    { id: 'LC4', name: 'Kerb', forceN: { x: 4_000, y: 0, z: 10_000 }, momentNm: { x: 0, y: 300, z: 250 }, loadPointMm: ZERO },
  ],
  loadCaseId: 'LC3',
}

export const DEFAULT_BOLT_INPUTS: BoltInputs = {
  mode: 'joint',
  serviceTempC: { minC: -20, maxC: 140 },
  joint: {
    design: DEFAULT_JOINT_DESIGN,
    loads: { axialMaxN: 12_000, axialMinN: 0, transverseN: 2_000, transverseVariation: 'alternating' },
  },
  pattern: DEFAULT_PATTERN,
}
