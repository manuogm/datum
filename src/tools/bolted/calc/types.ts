import type { Material } from '../../../core/materials'
import type { UnitSystem } from '../../../core/units'
import type { WasherDimensions } from './boltDimensions'
import type { ThreadEngagement } from './engagement'
import type { BoltMaterial, PropertyClass } from './propertyClasses'
import type { LimitingSurfacePressure } from './rules'
import type { WorkingStress } from './strength'
import type { ThreadGeometry } from './threads'

// ── Input ────────────────────────────────────────────────────────────────

/**
 * The material data a clamped plate or a tapped part needs: a Material from
 * the materials database, or a custom one. The limiting surface pressure pG
 * (VDI 2230-1 Table A9) is not in the database; give it here to override the
 * value from rules.ts.
 */
export type JointMaterial =
  Pick<Material, 'id' | 'name' | 'family' | 'youngsModulusGPa' | 'thermalExpansionUmPerMK' | 'yieldStrengthMPa' | 'tensileStrengthMPa'>
  & { readonly limitingSurfacePressureMPa?: number }

/** One clamped part, listed from the bolt head towards the nut / tapped part. */
export interface ClampedPlate {
  readonly material: JointMaterial
  readonly thicknessMm: number
}

/** Hexagon head (ISO 4014/4017) or hexagon socket head cap screw (ISO 4762). */
export type HeadType = 'hex' | 'socket'

/** Wire thread insert (Helicoil type, NASM 33537 / DIN 8140) or key-locking solid insert (Keensert type). */
export type InsertType = 'helical-coil' | 'key-locking'

export interface ThreadSize {
  readonly nominalMm: number
  /** Omitted: coarse pitch. */
  readonly pitchMm?: number
}

/**
 * What the bolt screws into.
 * - through-bolt: through-bolted joint (VDI 2230 "DSV") with an ISO 4032 hexagon
 *   nut of the matching property class (ISO 898-2), so the nut thread does not strip first.
 * - tapped: tapped thread joint ("ESV"); the bolt screws `engagementMm` deep into `material`.
 * - insert: tapped joint with a thread insert in `material`; `engagementMm` is
 *   the insert length. `outerThread` is the thread the insert makes in the
 *   parent: optional for a helical-coil insert (default: the STI thread, see
 *   engagement.ts), required for a key-locking insert (from the insert catalogue).
 */
export type JointType =
  | { readonly kind: 'through-bolt' }
  | { readonly kind: 'tapped'; readonly material: JointMaterial; readonly engagementMm: number }
  | {
    readonly kind: 'insert'; readonly insert: InsertType; readonly material: JointMaterial
    readonly engagementMm: number; readonly outerThread?: Required<ThreadSize>
  }

/** VDI 2230-1 Table A8 tightening methods, see TIGHTENING_METHODS. */
export type TighteningMethod = 'torque-wrench' | 'torque-wrench-calibrated' | 'impact-wrench'

/** A tightening method, or a tightening factor αA = FMmax/FMmin of your own (≥ 1). */
export type Tightening = { readonly method: TighteningMethod } | { readonly tighteningFactor: number }

/** Where the axial load enters the clamped parts, see LOAD_INTRODUCTION_FACTOR in rules.ts. */
export type LoadIntroductionPosition = 'near-head' | 'middle' | 'near-interface'

/** A position preset, or the load introduction factor n from VDI 2230-1 Table 2 (0 … 1). */
export type LoadIntroduction = { readonly position: LoadIntroductionPosition } | { readonly factor: number }

/** Mean roughness depth Rz of the contact surfaces, the rows of VDI 2230-1 Table 5. */
export type SurfaceRoughness = 'rz-below-10' | 'rz-10-to-40' | 'rz-40-to-160'

/** Thread rolled before or after heat treatment (VDI 2230-1 R9: σASV or σASG). */
export type ThreadRolling = 'before-heat-treatment' | 'after-heat-treatment'

export type LoadVariation = 'static' | 'alternating'

/** Temperature range of the joint in service; bolt and parts at the same uniform temperature. */
export interface TemperatureRangeC {
  readonly minC: number
  readonly maxC: number
}

/** Everything about the joint except its loads (one joint type of a bolt pattern). */
export interface JointDesign {
  readonly thread: ThreadSize
  readonly propertyClass: PropertyClass
  readonly headType: HeadType
  /** ISO 7089 plain washer under the head, and under the nut of a through-bolt. */
  readonly washers: boolean
  /** Unthreaded shank (diameter d) inside the clamp length; 0 (fully threaded) when omitted. */
  readonly shankLengthMm?: number
  /** Default 'before-heat-treatment': standard ISO 898-1 bolts. */
  readonly threadRolling?: ThreadRolling
  readonly joint: JointType
  /** At least one; washers are added by `washers`, not listed here. */
  readonly plates: readonly ClampedPlate[]
  /**
   * DA: outer diameter of the clamped parts around the bolt (VDI 2230-1 §5.1.2).
   * For a plate, the smaller of twice the edge distance and the bolt spacing.
   */
  readonly outerDiameterMm: number
  readonly tightening: Tightening
  /** ν: share of Rp0.2 used by the equivalent stress when tightening (VDI 2230-1 R7); 0.9 when omitted. */
  readonly utilisation?: number
  /** µG, thread friction (lowest expected value). */
  readonly threadFriction: number
  /** µK, head (or nut) bearing friction (lowest expected value). */
  readonly headFriction: number
  /** µT, friction between the clamped parts (lowest expected value). */
  readonly interfaceFriction: number
  /** qF: number of interfaces that transmit the transverse load by friction; 1 when omitted. */
  readonly frictionInterfaces?: number
  readonly surfaceRoughness: SurfaceRoughness
  readonly loadIntroduction: LoadIntroduction
  /** Omitted: no thermal preload change. */
  readonly serviceTempC?: TemperatureRangeC
  /** Temperature at assembly; 20 °C when omitted. */
  readonly assemblyTempC?: number
}

export interface JointLoads {
  /** FA,max: largest axial working load per bolt (tension positive). */
  readonly axialMaxN: number
  /** FA,min: smallest axial load in the cycle; 0 when omitted (load cycles between 0 and FA,max). */
  readonly axialMinN?: number
  /** FQ,max: transverse load per bolt; 0 when omitted. */
  readonly transverseN?: number
  /** MY,max: torque about the bolt axis carried by interface friction; 0 when omitted. */
  readonly torqueNm?: number
  /** Friction radius ra for `torqueNm`; (dW + dh)/4 when omitted. */
  readonly frictionRadiusMm?: number
  /** Static (SG ≥ 1.2) or alternating (SG ≥ 1.8) transverse load; 'alternating' when omitted. */
  readonly transverseVariation?: LoadVariation
  /** A clamp load needed for another reason (e.g. sealing, FKP); 0 when omitted. */
  readonly minClampForceN?: number
}

export interface BoltedJointInput extends JointDesign {
  readonly loads: JointLoads
  /** Units of the messages; SI when omitted. Numbers are always SI (N, mm, MPa, N·m). */
  readonly unitSystem?: UnitSystem
}

// ── Output ───────────────────────────────────────────────────────────────

export interface BoltGeometry {
  readonly thread: ThreadGeometry
  readonly material: BoltMaterial
  readonly headType: HeadType
  /** dW: outer bearing diameter of the head (VDI 2230 dW, the minimum dw). */
  readonly headBearingMm: number
  /** dW of the nut, for a through-bolt. */
  readonly nutBearingMm: number | null
  /** dh: ISO 273 medium clearance hole in the clamped parts. */
  readonly clearanceHoleMm: number
  readonly washer: WasherDimensions | null
  /** lK: clamp length, plates plus washers. */
  readonly clampLengthMm: number
}

/** One elastic section of the bolt: δi = li / (E·Ai). */
export interface ResilienceSegment {
  readonly name: string
  readonly lengthMm: number
  readonly areaMm2: number
  readonly modulusMPa: number
  readonly resilienceMmPerN: number
}

export interface Resilience {
  readonly boltSegments: readonly ResilienceSegment[]
  /** δS, R3. */
  readonly boltMmPerN: number
  /** δP, R3, substitute deformation cone (plus sleeve when DA < DA,Gr). */
  readonly platesMmPerN: number
  /** δP share of each clamped part (washers first and last when fitted), same order as the stack. */
  readonly plateShareMmPerN: readonly number[]
  readonly coneTanPhi: number
  readonly coneAngleDeg: number
  /** DA,Gr = dW + w·lK·tan φ: the outer diameter at which the cone is fully developed. */
  readonly coneLimitDiameterMm: number
  /** cS = 1/δS. */
  readonly boltStiffnessNPerMm: number
  /** cP = 1/δP. */
  readonly platesStiffnessNPerMm: number
}

export interface Preload {
  /** αA = FMmax / FMmin (R1). */
  readonly tighteningFactor: number
  /** ν (R7). */
  readonly utilisation: number
  /** fZ: plastic embedding (R4, Table 5). */
  readonly embeddingUm: number
  /** FZ = fZ / (δS + δP) (R4). */
  readonly embeddingLossN: number
  /** ΔFVth: largest preload loss from temperature (≥ 0). */
  readonly thermalLossN: number
  /** Largest preload gain from temperature (≥ 0). */
  readonly thermalGainN: number
  /** FKQerf: clamp load needed against slip (R2). */
  readonly slipClampForceN: number
  /** FKerf: required minimum clamp load (R2). */
  readonly requiredClampForceN: number
  /** FMerf: required minimum assembly preload (R5). */
  readonly requiredAssemblyMinN: number
  /** FMzul = FMmax: permissible assembly preload at ν (R7). */
  readonly assemblyMaxN: number
  /** FMmin = FMzul / αA (R6). */
  readonly assemblyMinN: number
  /** FV,min = FMmin − FZ − ΔFVth: the lowest preload in service. */
  readonly serviceMinN: number
  /** FKR,min = FV,min − (1 − Φn)·FA,max: residual clamp load. */
  readonly residualClampMinN: number
  /** FA at which the parts separate: FV,min / (1 − Φn). */
  readonly separationAxialN: number
  /** FSmax = FMzul + Φn·FA,max + thermal gain (R8). */
  readonly boltForceMaxN: number
  /** MA (R13). */
  readonly tighteningTorqueNm: number
}

export interface BoltStresses {
  /** R8: stresses under FSmax. */
  readonly working: WorkingStress
  /** R9: σa. */
  readonly alternatingMPa: number
  /** R9: σASV or σASG. */
  readonly fatigueLimitMPa: number
}

/** Bearing pressure under the head or the nut on the clamped part below it (R10). */
export interface BearingPressure {
  readonly side: 'head' | 'nut'
  readonly material: JointMaterial
  /** Outer diameter of the bearing ring on the part (dW, or the load spread under a washer). */
  readonly outerMm: number
  readonly innerMm: number
  readonly areaMm2: number
  /** pmax = max(FMzul, FSmax) / Ap. */
  readonly pressureMPa: number
  /** pG; null when not known (enter it with the material). */
  readonly limit: LimitingSurfacePressure | null
}

export type StepStatus = 'pass' | 'warn' | 'fail' | 'info'

/** Unit of a number in the calculation trail; the screens convert to the viewer's unit system. */
export type TrailUnit = 'N' | 'mm' | 'mm²' | 'MPa' | 'mm/N' | 'N/mm' | 'N·m' | 'µm' | '°' | ''

export interface TrailValue {
  /** e.g. 'FMzul', 'δS', 'Φn' */
  readonly symbol: string
  readonly label: string
  readonly value: number
  readonly unit: TrailUnit
}

/** Result of a check: the value, its limit and the safety factor between them. */
export interface StepCheck {
  readonly value: TrailValue
  readonly limit: TrailValue
  readonly safetyFactor: number
  readonly requiredSafetyFactor: number
  /** requiredSafetyFactor / safetyFactor: 1 is the VDI requirement exactly met; Infinity when safetyFactor ≤ 0. */
  readonly utilisation: number
}

export type StepId =
  | 'geometry' | 'tightening-factor' | 'required-clamp-load' | 'load-factor' | 'preload-changes'
  | 'minimum-preload' | 'separation' | 'preload-range' | 'assembly-stress' | 'working-stress'
  | 'alternating-stress' | 'surface-pressure' | 'engagement' | 'slip' | 'tightening-torque'

/** One step of the calculation trail, in VDI 2230-1 order R0 … R13. */
export interface CalculationStep {
  readonly id: StepId
  /** 'R0' … 'R13'. */
  readonly rStep: string
  readonly title: string
  /** Clause and equations used, e.g. 'VDI 2230-1:2015 R12, eq. (R12/1)'. */
  readonly clause: string
  readonly values: readonly TrailValue[]
  /** null for steps that only calculate (status 'info'), or a check that does not apply. */
  readonly check: StepCheck | null
  readonly status: StepStatus
  /** Plain-English result with the numbers. */
  readonly message: string
}

export interface JointSummary {
  /** Worst status of the checks. */
  readonly status: Exclude<StepStatus, 'info'>
  readonly checksPassed: number
  readonly checksTotal: number
  /** The check with the highest utilisation (excluding assembly stress, which ν fixes). */
  readonly governing: StepId | null
  /** Its utilisation: 1 means the VDI requirement is just met. */
  readonly utilisation: number
}

export interface BoltedJointAnalysis {
  readonly geometry: BoltGeometry
  readonly resilience: Resilience
  /** n (R3). */
  readonly loadIntroductionFactor: number
  /** Φn = n·δP/(δS + δP) (R3). */
  readonly loadFactor: number
  readonly preload: Preload
  readonly stresses: BoltStresses
  /** R10: head side first, then the nut side of a through-bolt. */
  readonly bearingPressures: readonly BearingPressure[]
  /** R11: null for a through-bolt with nut. */
  readonly engagement: ThreadEngagement | null
  readonly steps: readonly CalculationStep[]
  readonly summary: JointSummary
}
