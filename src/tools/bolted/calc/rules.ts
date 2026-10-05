import type { MaterialFamily } from '../../../core/materials'
import type { JointMaterial, LoadIntroductionPosition, StepStatus, TighteningMethod } from './types'

/**
 * Values the bolted-joint engine takes from VDI 2230-1:2015 tables or
 * requirements, and the judgement calls it makes where VDI 2230 asks for
 * data the user rarely has, in one place so they can be checked and tuned.
 *
 * "UNSURE" marks values recalled rather than transcribed from the source:
 * check them against the standard before relying on them for sign-off.
 */

// ── Requirements (VDI 2230-1:2015) ─────────────────────────────────────────

/** ν: utilisation of Rp0.2 by the equivalent stress at assembly that VDI 2230-1 R7 recommends (and its Table A1 uses). */
export const STANDARD_UTILISATION = 0.9

/** Required safety factors (VDI 2230-1 R8 … R12; R5 and separation: the force itself must suffice). */
export const REQUIRED_SAFETY = {
  minimumPreload: 1, // R5: FMmin ≥ FMerf
  separation: 1, // FA,sep ≥ FA,max (Datum presentation of the same condition, see analyseJoint.ts)
  workingStress: 1, // R8: SF = Rp0.2 / σred,B ≥ 1.0
  alternatingStress: 1.2, // R9: SD = σAS / σa ≥ 1.2
  surfacePressure: 1, // R10: SP = pG / pmax ≥ 1.0
  engagement: 1, // R11: meff ≥ meff,min
  slipStatic: 1.2, // R12: SG ≥ 1.2 for static transverse load
  slipAlternating: 1.8, // R12: SG ≥ 1.8 for alternating transverse load
} as const

/**
 * kτ: reduction of the torsional stress from tightening for the working
 * state (VDI 2230-1 R8): the torsion relaxes once the joint is loaded; 0.5 is
 * the value VDI 2230 recommends.
 */
export const TORSION_REDUCTION = 0.5

// ── Tables (VDI 2230-1:2015) ───────────────────────────────────────────────

/**
 * Tightening factor αA (VDI 2230-1 Table A8) and the range it comes from.
 * The representative value is the lower end of each range, as in the
 * VDI 2230 examples.
 * UNSURE: the ranges are recalled; Table A8 splits torque-wrench tightening
 * further by how the friction coefficient was found and by surface condition.
 */
export const TIGHTENING_METHODS: Readonly<Record<TighteningMethod, { readonly factor: number; readonly range: string; readonly description: string }>> = {
  'torque-wrench-calibrated': { factor: 1.4, range: '1.4 … 1.6',
    description: 'Torque wrench or precision nutrunner, torque found by tests on the actual joint' },
  'torque-wrench': { factor: 1.6, range: '1.6 … 2.0',
    description: 'Torque wrench, torque calculated from estimated friction coefficients' },
  'impact-wrench': { factor: 2.5, range: '2.5 … 4.0',
    description: 'Impact or impulse wrench, adjusted by a stiffness test' },
}

/** Plastic embedding fZ in µm per thread, per head or nut bearing face, and per inner interface (VDI 2230-1 Table 5). */
export interface EmbeddingPerSurfaceUm {
  readonly thread: number
  readonly bearing: number
  readonly interface: number
}

/**
 * VDI 2230-1 Table 5, guide values for solid steel parts, by Rz and load
 * direction (axial tension/compression, or transverse/shear).
 * UNSURE: recalled; the values for aluminium parts can be higher.
 */
export const EMBEDDING_UM = {
  'rz-below-10': { axial: { thread: 3, bearing: 2.5, interface: 1.5 }, transverse: { thread: 3, bearing: 3, interface: 2 } },
  'rz-10-to-40': { axial: { thread: 3, bearing: 3, interface: 2 }, transverse: { thread: 3, bearing: 4.5, interface: 2.5 } },
  'rz-40-to-160': { axial: { thread: 3, bearing: 4, interface: 3 }, transverse: { thread: 3, bearing: 6.5, interface: 3.5 } },
} as const satisfies Record<string, Record<'axial' | 'transverse', EmbeddingPerSurfaceUm>>

/**
 * Limiting surface pressure pG for materials in the database, in MPa
 * (VDI 2230-1 Table A9, nearest listed material).
 * UNSURE: all recalled, not transcribed. Override with
 * JointMaterial.limitingSurfacePressureMPa for sign-off.
 */
export const LIMITING_SURFACE_PRESSURE_MPA: Readonly<Record<string, number>> = {
  'steel-s355': 760, // S355J0 (St 52-3)
  'steel-c45-n': 700, // C45
  'steel-42crmo4-qt': 850, // 42CrMo4 QT
  'steel-316l': 630, // X5CrNi18-10
  'steel-a4-80': 630, // X5CrNi18-10
  'ci-gjl-250': 850, // EN-GJL-250
  'ci-gjs-400-15': 600, // EN-GJS-400
  'al-6061-t6': 360, // AlMgSi1 F31 (6082) as the nearest listed alloy
  'al-6082-t6': 360, // AlMgSi1 F31
  'al-7075-t6': 410, // AlZnMgCu1.5
  'al-2014-t6': 330, // AlCuMg1 F40 (2017) as the nearest listed alloy
  'mg-az31b': 220, // GMgAl9Zn1 (AZ91) as the nearest listed alloy
  'ti-6al-4v': 1000, // TiAl6V4
}

/**
 * Ratio of shear strength to tensile strength τB/Rm for thread stripping
 * (VDI 2230-1 R11). null: thread engagement in this family is not assessed.
 * UNSURE: recalled from VDI 2230 Table 7 ranges (steel 0.6 … 0.65,
 * aluminium alloys 0.7, titanium 0.6, grey cast iron about 0.9); the lower
 * end of each range is used. Other metals: 0.6 (Datum judgement).
 */
export const SHEAR_STRENGTH_RATIO: Readonly<Record<MaterialFamily, number | null>> = {
  steel: 0.6,
  aluminium: 0.7,
  titanium: 0.6,
  'cast-iron': 0.9,
  nickel: 0.6,
  magnesium: 0.6,
  copper: 0.6,
  composite: null,
  polymer: null,
}

/** τB/Rm of the bolt's own thread: 0.6 for ISO 898-1 steels, 0.8 for austenitic stainless (UNSURE, VDI 2230 Table 7). */
export const BOLT_SHEAR_STRENGTH_RATIO = { steel: 0.6, stainless: 0.8 } as const

// ── Datum judgement ───────────────────────────────────────────────────────

export interface LimitingSurfacePressure {
  readonly valueMPa: number
  /** Where pG comes from: given with the material, VDI 2230 Table A9, or estimated as Rm. */
  readonly source: 'input' | 'table' | 'estimate'
}

/**
 * pG of a clamped part: the value given with the material, else
 * LIMITING_SURFACE_PRESSURE_MPA, else estimated as its tensile strength Rm.
 * UNSURE: the estimate is rough (Table A9 values lie roughly between 0.75·Rm
 * for high-strength aluminium and 1.5·Rm for structural steel), so a check
 * that relies on it is never better than 'warn'. null when none of these is
 * known (composites, polymers).
 */
export function limitingSurfacePressure(material: JointMaterial): LimitingSurfacePressure | null {
  if (material.limitingSurfacePressureMPa !== undefined) return { valueMPa: material.limitingSurfacePressureMPa, source: 'input' }
  const tabulated = LIMITING_SURFACE_PRESSURE_MPA[material.id]
  if (tabulated !== undefined) return { valueMPa: tabulated, source: 'table' }
  return material.tensileStrengthMPa === null ? null : { valueMPa: material.tensileStrengthMPa, source: 'estimate' }
}

/**
 * Load introduction factor n for a position preset. VDI 2230-1 Table 2 gives
 * n from the joint shape (SV1 … SV6) and the ratios lA/h and ak/h; its values
 * run from about 0.7 (load introduced next to the head and nut) down to
 * about 0.1 (next to the interface). These presets are rounded
 * representatives (UNSURE): enter the factor from Table 2 for sign-off.
 */
export const LOAD_INTRODUCTION_FACTOR: Readonly<Record<LoadIntroductionPosition, number>> = {
  'near-head': 0.7,
  middle: 0.5,
  'near-interface': 0.3,
}

/**
 * The load spreads through a hardened washer at 45°, so the plate under it
 * bears on a diameter of dW + 2·h, at most the washer's outer diameter.
 * VDI 2230 lets the full washer diameter count only for washers that are
 * thick and hard enough; this is the conservative middle ground.
 */
export function bearingDiameterUnderWasherMm(headBearingMm: number, washerOuterMm: number, washerThicknessMm: number): number {
  return Math.min(washerOuterMm, headBearingMm + 2 * washerThicknessMm)
}

/**
 * Status of a check:
 * - pass: the safety factor meets the VDI 2230 requirement;
 * - warn: the limit itself is not exceeded (S ≥ 1), but the VDI 2230 margin
 *   is not met, so the design needs review (e.g. SG = 1.45 < 1.8);
 * - fail: the limit is exceeded (S < 1): yield, slip, separation, crushing…
 */
export function checkStatus(safetyFactor: number, requiredSafetyFactor: number): Exclude<StepStatus, 'info'> {
  if (safetyFactor >= requiredSafetyFactor) return 'pass'
  return safetyFactor >= 1 ? 'warn' : 'fail'
}
