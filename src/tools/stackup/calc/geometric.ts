import { SOURCE } from './sources'
import type {
  Conversion, DatumReference, DrawingStandard, GeometricBreakdown, GeometricCharacteristic, GeometricTolerance, SurfaceBoundary,
} from './types'

/**
 * Geometric tolerances in a one-dimensional stack.
 *
 * A geometric tolerance defines a zone t wide (or ⌀t) in which the surface,
 * axis or centre plane must lie. Where the stack passes through that
 * feature, the point can sit anywhere in the zone, so along the stack
 * direction it contributes the zone as an equal bilateral ±t/2 about the
 * basic (nominal) position: the standard loop-diagram rule (Drake ch. 9;
 * Fischer 2011). ⌀t and a zone t wide give the same ±t/2 along one direction.
 *
 * Modifiers that change the band: Ⓜ/Ⓛ bonus widens it (or, stacked to the
 * feature surface, the virtual / resultant condition boundaries replace it),
 * Ⓤ/UZ moves its mean, seating on the high points makes a form tolerance
 * one-sided. Modifiers recorded and explained, with no change to a rigid 1D
 * stack: Ⓟ, Ⓕ, Ⓣ, CZ (modifierNotes below). MMB/LMB datum shift is not
 * part of the row: it is its own 'datum-shift' row (datumShiftDeviations).
 *
 * The rule is the same for every characteristic; what differs is WHEN the
 * tolerance belongs in the chain (appliesWhen). Form and orientation
 * tolerances refine a size or location tolerance and usually sit inside
 * it, so adding them where that size or location is already in the chain
 * counts the same variation twice.
 */
export interface GeometricRule {
  readonly name: string
  /** ISO 1101 / ASME Y14.5 symbol. */
  readonly symbol: string
  /** Short form of the conversion, e.g. 'position ⌀t → ±t/2'. */
  readonly rule: string
  readonly appliesWhen: string
  readonly source: string
  /** Why the rule is a judgement call (see the engine notes), or null. */
  readonly unsure: string | null
  /**
   * The characteristic exists in the standard. ASME Y14.5-2018 removed
   * concentricity and symmetry (they are in Y14.5-2009 only; position,
   * runout or profile replace them); ISO 1101:2017 keeps coaxiality and
   * symmetry.
   */
  readonly standards: { readonly iso: boolean; readonly asme: boolean }
  /**
   * Ⓜ/Ⓛ allowed: the tolerance applies to a feature of size. ASME
   * Y14.5-2018 has no coaxiality or symmetry (removed; the 2009 edition held
   * concentricity and symmetry RFS only); ISO 2692:2021 allows MMR/LMR on
   * any derived feature, coaxiality and symmetry included. Profile and
   * runout are RFS in both.
   */
  readonly materialCondition: { readonly iso: boolean; readonly asme: boolean }
  /** ⌀ allowed: the zone can be cylindrical (an axis). */
  readonly diameterZone: boolean
  /** Datum references allowed (not on form tolerances). */
  readonly datums: boolean
  /** MMB/LMB allowed on its datum references (runout: datums RMB only). */
  readonly datumBoundary: boolean
  /** Ⓟ allowed (position and orientation). */
  readonly projected: boolean
  /** Ⓤ / UZ allowed (profile only: ASME Y14.5-2018 §11; ISO 1101:2017). */
  readonly unequal: boolean
  /**
   * Ⓣ tangent plane allowed: on a planar feature, under orientation and
   * profile in both standards (ASME Y14.5-2018 §9 and §11), and under ISO
   * also on the location (position) of a planar feature (ISO 1101:2017).
   */
  readonly tangentPlane: { readonly iso: boolean; readonly asme: boolean }
  /**
   * CZ combined zone allowed: an ISO 1101:2017 modifier (several features,
   * one zone). ASME has no CZ: it uses SIM REQT (simultaneous requirement)
   * or a continuous feature ⟨CF⟩ instead.
   */
  readonly combinedZone: { readonly iso: boolean; readonly asme: boolean }
  /**
   * "Stack to the feature surface" allowed with Ⓜ/Ⓛ: the tolerance locates
   * a feature of size, so its surface lies between the virtual and the
   * resultant condition (position; ISO coaxiality and symmetry). An
   * orientation or form tolerance at MMC does not locate the feature, so
   * its boundary floats and cannot stand for the surface's location.
   */
  readonly surfaceBoundary: { readonly iso: boolean; readonly asme: boolean }
  /** "Seats on its high points" (one-sided 0/−t) allowed: flatness and straightness of a surface. */
  readonly highPoints: boolean
}

const BOTH = { iso: true, asme: true } as const
const NEITHER = { iso: false, asme: false } as const
const ISO_ONLY = { iso: true, asme: false } as const

/**
 * When a form tolerance belongs in the chain. ASME Y14.5-2018 Rule #1
 * (envelope principle, §5) keeps the form of a feature of size within its
 * size tolerance; ISO 8015:2011 (independency principle) does not, unless
 * the size carries Ⓔ.
 */
const FORM_APPLIES: Readonly<Record<DrawingStandard, string>> = {
  iso: 'Only where the stack passes through a point of this surface that no other tolerance in the chain already bounds. '
    + 'Under ISO 8015 (independency) form is not inside the size tolerance unless the size carries Ⓔ, so on a feature of size without Ⓔ it adds to the size. '
    + 'If the face seats on its high points against a flat mating face, choose "seats on its high points" (one-sided, 0 to t into the material).',
  asme: 'Only where the stack passes through a point of this surface that no other tolerance in the chain already bounds. '
    + 'Rule #1 (envelope, ASME Y14.5-2018 §5) keeps the form of a feature of size inside its size tolerance, so do not add it when the size of this same feature is already in the chain. '
    + 'If the face seats on its high points against a flat mating face, choose "seats on its high points" (one-sided, 0 to t into the material).',
}

const FORM_UNSURE = 'Centred ±t/2 is the convention for a point anywhere on the surface. '
  + 'A face that rests on its high points against a flat mating face sits on the edge of the zone instead (0 to t into the material, one-sided): use "seats on its high points" for that case.'

const ORIENTATION_APPLIES = 'Only where the location of this feature is not already in the chain at the point the stack passes through: '
  + 'an orientation tolerance refines a location tolerance and lies inside it. '
  + 'Typical case: a feature located at one place (a pin positioned at its base) and the stack passing at another (the tip of the pin).'

// The tilt inside a zone t over a feature length L grows linearly beyond the
// feature: at a height H from the feature's root it is t·H/L (similar
// triangles; ASME Y14.5-2018 §9 and §10, projected tolerance zone).
const ORIENTATION_UNSURE = 'Treating the whole zone t as ±t/2 at the point of the stack is conservative along the feature, '
  + 'where the tilt actually seen depends on where the stack passes, which a 1D stack does not model. '
  + 'Beyond the feature it understates: at a height H above the root of a feature of length L the tilt reaches t·H/L, '
  + 'so scale the zone by H/L for a point past the end of the feature, or put Ⓟ on the frame.'

const PROFILE_RULE = 'profile t → ±t/2 equally disposed; Ⓤ/UZ: mean shifted by (share on the + side − t/2), ±t/2 about it'

// ASME Y14.5-2018 §12, ISO 1101:2017 runout: radially an axis offset e gives
// FIM = 2e; axially the FIM is the face's wobble (and form) at each radius,
// relative to a plane perpendicular to the datum axis wherever it sits along
// that axis, so axial runout does not locate the face.
const RUNOUT_APPLIES = 'Radial runout: the stack passes through the surface or its axis in a radial direction; the axis offset e = FIM/2 gives ±t/2. '
  + 'Axial (face) runout does not locate the face: its zone floats along the datum axis. '
  + "Add it only as an orientation-type refinement (wobble of the face), where the face's axial location comes from another row of the chain; never in place of that location."
const RUNOUT_RULE = 'runout t (FIM) → ±t/2: radial axis offset e = FIM/2; axial: face wobble about its located position (a refinement)'

const POSITION_APPLIES = 'The stack passes through the axis or centre plane of the feature, located by a basic dimension. '
  + 'To reach a surface of the feature at RFS, add half its size as a separate row (radius or half-width, with half the size tolerance). '
  + 'With Ⓜ or Ⓛ, choose "stack to the feature surface" instead: that one row runs between the virtual and resultant conditions '
  + 'and replaces the radius row, so do not add a radius row with it.'

/** appliesWhen of a row stacked to the feature surface (stackTo). */
const SURFACE_APPLIES = 'This row already reaches the surface of the feature (between its virtual and resultant condition): '
  + 'do not add a separate radius or half-width row for this feature, and do not add its size again.'

const ORIENTATION = {
  standards: BOTH, materialCondition: BOTH, diameterZone: true, datums: true, datumBoundary: true, projected: true, unequal: false,
  tangentPlane: BOTH, combinedZone: ISO_ONLY, surfaceBoundary: NEITHER, highPoints: false,
} as const
const FORM_FLAGS = {
  standards: BOTH, datums: false, datumBoundary: false, projected: false, unequal: false,
  tangentPlane: NEITHER, combinedZone: ISO_ONLY, surfaceBoundary: NEITHER, highPoints: true,
} as const
const PROFILE = {
  standards: BOTH, materialCondition: NEITHER, diameterZone: false, datums: true, datumBoundary: true, projected: false, unequal: true,
  tangentPlane: BOTH, combinedZone: ISO_ONLY, surfaceBoundary: NEITHER, highPoints: false,
} as const
const RUNOUT = {
  standards: BOTH, materialCondition: NEITHER, diameterZone: false, datums: true, datumBoundary: false, projected: false, unequal: false,
  tangentPlane: NEITHER, combinedZone: ISO_ONLY, surfaceBoundary: NEITHER, highPoints: false,
} as const
/** Coaxiality and symmetry: ISO 1101:2017 only (removed from ASME Y14.5 in 2018). */
const ISO_LOCATION = {
  standards: ISO_ONLY, materialCondition: ISO_ONLY, datums: true, datumBoundary: true, projected: false, unequal: false,
  tangentPlane: NEITHER, combinedZone: ISO_ONLY, surfaceBoundary: ISO_ONLY, highPoints: false,
} as const

/** appliesWhen of flatness and straightness is FORM_APPLIES for the drawing standard, see geometricRule. */
export const GEOMETRIC_RULES: Readonly<Record<GeometricCharacteristic, GeometricRule>> = {
  // The axis or centre plane lies in a zone ⌀t (or t wide) centred on the
  // true position (ASME Y14.5-2018 §10; ISO 1101:2017 position). Along any
  // one direction the offset is at most t/2 either way.
  position: {
    name: 'Position', symbol: '⌖', rule: 'position ⌀t (or t wide) → ±t/2 on the axis or centre plane',
    appliesWhen: POSITION_APPLIES,
    source: `${SOURCE.asme} §10; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}; ${SOURCE.fischer}`, unsure: null,
    standards: BOTH, materialCondition: BOTH, diameterZone: true, datums: true, datumBoundary: true, projected: true, unequal: false,
    // ISO 1101:2017 allows Ⓣ on the location of a planar feature; ASME Y14.5-2018 on orientation and profile only.
    tangentPlane: ISO_ONLY, combinedZone: ISO_ONLY, surfaceBoundary: BOTH, highPoints: false,
  },
  // Every point of the surface lies within a zone t wide about the true
  // profile; equally disposed unless stated (ASME Y14.5-2018 §11, Ⓤ for
  // unequal; ISO 1101:2017, UZ for an offset zone).
  'profile-surface': {
    name: 'Profile of a surface', symbol: '⌓', rule: PROFILE_RULE,
    appliesWhen: 'The profile is related to datums and so locates the surface the stack passes through. '
      + 'Without datums it controls form only: treat it as flatness.',
    source: `${SOURCE.asme} §11; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null, ...PROFILE,
  },
  // A line profile controls each line element (cross-section) separately; it
  // locates the section only when related to datums that locate it
  // (ASME Y14.5-2018 §11; ISO 1101:2017).
  'profile-line': {
    name: 'Profile of a line', symbol: '⌒', rule: PROFILE_RULE,
    appliesWhen: 'The stack passes through the cross-section the line profile controls, and the profile is related to datums that locate that section. '
      + 'Without such datums it controls the shape of each section only, not where it is: then it does not belong in a location chain.',
    source: `${SOURCE.asme} §11; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`,
    unsure: 'A line profile controls each cross-section separately, not the surface as a whole; '
      + 'it is treated like a surface profile at the section the stack passes through.',
    ...PROFILE,
  },
  // The surface lies between two parallel planes t apart (ASME Y14.5-2018 §8;
  // ISO 1101:2017 flatness). Ⓜ/Ⓛ only on the derived median plane of a feature of size.
  flatness: {
    name: 'Flatness', symbol: '⏥', rule: 'flatness t → ±t/2 about the nominal position of the surface; seated on its high points: 0 to t into the material',
    appliesWhen: FORM_APPLIES.iso, source: `${SOURCE.asme} §8 (form), §5 (Rule #1); ${SOURCE.iso1101}; ${SOURCE.iso8015}; ${SOURCE.drakeStacks}`,
    unsure: FORM_UNSURE, materialCondition: BOTH, diameterZone: false, ...FORM_FLAGS,
  },
  // Line elements (or the derived median line) lie between two lines t apart
  // or in a cylinder ⌀t (ASME Y14.5-2018 §8; ISO 1101:2017 straightness).
  straightness: {
    name: 'Straightness', symbol: '⏤', rule: 'straightness t → ±t/2 about the nominal position of the line or axis; seated on its high points: 0 to t into the material',
    appliesWhen: FORM_APPLIES.iso, source: `${SOURCE.asme} §8 (form), §5 (Rule #1); ${SOURCE.iso1101}; ${SOURCE.iso8015}; ${SOURCE.drakeStacks}`,
    unsure: FORM_UNSURE, materialCondition: BOTH, diameterZone: true, ...FORM_FLAGS,
  },
  // The surface or axis lies within a zone t wide (or ⌀t) at the basic
  // orientation to the datums; the zone floats within the location tolerance
  // (ASME Y14.5-2018 §9; ISO 1101:2017).
  parallelism: {
    name: 'Parallelism', symbol: '∥', rule: 'parallelism t → ±t/2 about the nominal position',
    appliesWhen: ORIENTATION_APPLIES, source: `${SOURCE.asme} §9; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: ORIENTATION_UNSURE, ...ORIENTATION,
  },
  perpendicularity: {
    name: 'Perpendicularity', symbol: '⊥', rule: 'perpendicularity t → ±t/2 about the nominal position',
    appliesWhen: ORIENTATION_APPLIES, source: `${SOURCE.asme} §9; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: ORIENTATION_UNSURE, ...ORIENTATION,
  },
  angularity: {
    name: 'Angularity', symbol: '∠', rule: 'angularity t → ±t/2 about the nominal position',
    appliesWhen: ORIENTATION_APPLIES, source: `${SOURCE.asme} §9; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: ORIENTATION_UNSURE, ...ORIENTATION,
  },
  // Runout t is a full indicator movement (FIM) while the part turns about the
  // datum axis (ASME Y14.5-2018 §12; ISO 1101:2017). Radially, an axis offset
  // e gives FIM = 2e, so e ≤ t/2. Axially the face's wobble is held to t, but
  // the face's position along the axis is not (see RUNOUT_APPLIES).
  'circular-runout': {
    name: 'Circular runout', symbol: '↗', rule: RUNOUT_RULE,
    appliesWhen: RUNOUT_APPLIES, source: `${SOURCE.asme} §12; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null, ...RUNOUT,
  },
  'total-runout': {
    name: 'Total runout', symbol: '⌰', rule: RUNOUT_RULE,
    appliesWhen: RUNOUT_APPLIES, source: `${SOURCE.asme} §12; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null, ...RUNOUT,
  },
  // The axis lies in a cylinder ⌀t coaxial with the datum axis (ISO 1101:2017
  // coaxiality). ASME concentricity (median points in ⌀t) is in Y14.5-2009
  // and was removed in Y14.5-2018 (position or runout replace it).
  coaxiality: {
    name: 'Coaxiality / concentricity', symbol: '◎', rule: 'coaxiality ⌀t → ±t/2 offset of the axis',
    appliesWhen: 'The stack passes through the axis in a radial direction. To reach the surface, add half the diameter as a separate row '
      + '(at RFS), or with Ⓜ/Ⓛ choose "stack to the feature surface" and add no radius row.',
    source: `${SOURCE.iso1101}; ${SOURCE.asme2009} (concentricity); ${SOURCE.drakeStacks}`, unsure: null,
    diameterZone: true, ...ISO_LOCATION,
  },
  // The median (centre) plane lies between two planes t apart, symmetric about
  // the datum centre plane (ISO 1101:2017; ASME Y14.5-2009, removed in 2018).
  symmetry: {
    name: 'Symmetry', symbol: '⌯', rule: 'symmetry t → ±t/2 offset of the centre plane',
    appliesWhen: 'The stack passes through the centre plane of the feature. To reach a face, add half the width as a separate row '
      + '(at RFS), or with Ⓜ/Ⓛ choose "stack to the feature surface" and add no half-width row.',
    source: `${SOURCE.iso1101}; ${SOURCE.asme2009}; ${SOURCE.drakeStacks}`, unsure: null,
    diameterZone: false, ...ISO_LOCATION,
  },
}

export const GEOMETRIC_CHARACTERISTICS = Object.keys(GEOMETRIC_RULES) as readonly GeometricCharacteristic[]

/** The rule of a characteristic, with the inclusion text of form tolerances worded for the drawing standard. */
export function geometricRule(characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso'): GeometricRule {
  const rule = GEOMETRIC_RULES[characteristic]
  return characteristic === 'flatness' || characteristic === 'straightness' ? { ...rule, appliesWhen: FORM_APPLIES[standard] } : rule
}

/** The characteristic exists in this standard (ASME Y14.5-2018 has no concentricity or symmetry). */
export const inStandard = (characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso') =>
  GEOMETRIC_RULES[characteristic].standards[standard]

/** The characteristics of a standard, in the order of GEOMETRIC_CHARACTERISTICS. */
export const characteristicsOf = (standard: DrawingStandard): readonly GeometricCharacteristic[] =>
  GEOMETRIC_CHARACTERISTICS.filter((characteristic) => inStandard(characteristic, standard))

/** Ⓜ/Ⓛ can be put on this characteristic under this standard. */
export const acceptsMaterialCondition = (characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso') =>
  GEOMETRIC_RULES[characteristic].materialCondition[standard]

/** The zone can carry ⌀. */
export const acceptsDiameterZone = (characteristic: GeometricCharacteristic) => GEOMETRIC_RULES[characteristic].diameterZone

/** Ⓣ can be put on this characteristic under this standard (planar features only). */
export const acceptsTangentPlane = (characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso') =>
  GEOMETRIC_RULES[characteristic].tangentPlane[standard]

/** CZ (combined zone) exists for this characteristic under this standard: ISO only. */
export const acceptsCombinedZone = (characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso') =>
  GEOMETRIC_RULES[characteristic].combinedZone[standard]

/** "Stack to the feature surface" can be chosen with Ⓜ/Ⓛ on this characteristic under this standard. */
export const acceptsSurfaceBoundary = (characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso') =>
  GEOMETRIC_RULES[characteristic].surfaceBoundary[standard] && acceptsMaterialCondition(characteristic, standard)

export const isProfile = (characteristic: GeometricCharacteristic) =>
  characteristic === 'profile-surface' || characteristic === 'profile-line'

/** What the editor may offer for a characteristic under a standard: one flag per field or modifier. */
export interface GeometricAvailability {
  /** The characteristic is in the standard; when false, offer it only with a warning (ASME: Y14.5-2009 drawings). */
  readonly inStandard: boolean
  readonly materialCondition: boolean
  readonly diameterZone: boolean
  readonly datums: boolean
  readonly datumBoundary: boolean
  readonly projected: boolean
  readonly unequal: boolean
  readonly tangentPlane: boolean
  readonly combinedZone: boolean
  /** Ⓕ: any characteristic of a non-rigid part, both standards (ASME Y14.5-2018; ISO 10579:2010). */
  readonly freeState: boolean
  /** "Stack to the feature surface" (needs Ⓜ/Ⓛ). */
  readonly surfaceBoundary: boolean
  /** "Seats on its high points" (flatness, straightness of a surface). */
  readonly highPoints: boolean
}

/** The rule flags of a characteristic resolved for one standard, for the editor. */
export function geometricAvailability(characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso'): GeometricAvailability {
  const rule = GEOMETRIC_RULES[characteristic]
  return {
    inStandard: rule.standards[standard],
    materialCondition: rule.materialCondition[standard],
    diameterZone: rule.diameterZone,
    datums: rule.datums,
    datumBoundary: rule.datumBoundary,
    projected: rule.projected,
    unequal: rule.unequal,
    tangentPlane: rule.tangentPlane[standard],
    combinedZone: rule.combinedZone[standard],
    freeState: true,
    surfaceBoundary: acceptsSurfaceBoundary(characteristic, standard),
    highPoints: rule.highPoints,
  }
}

/**
 * ISO 1101:2017 UZ gives the offset v of the zone centre from the true
 * profile, + towards the outside of the material. The engine's Ⓤ value (the
 * part of the zone on the material-adding side) is then t/2 + v. Any v is
 * allowed in ISO, so the value may be below 0 or above t (zone wholly on
 * one side of the true profile).
 */
export const unequalValueFromIsoOffset = (zone: number, offset: number): number => zone / 2 + offset

/** The ISO UZ offset of the zone centre for an Ⓤ value: value − t/2. */
export const isoOffsetFromUnequalValue = (zone: number, value: number): number => value - zone / 2

/**
 * Largest bonus tolerance from Ⓜ or Ⓛ on the tolerance: the zone grows by
 * the feature's departure from MMC (Ⓜ) or LMC (Ⓛ), at most the whole size
 * tolerance (max − min) when the feature is at the opposite limit
 * (ASME Y14.5-2018 §10, bonus tolerance; ISO 2692:2021 MMR/LMR; Drake ch. 9).
 * Whether the feature is a hole or a pin does not change this: either way
 * the departure from one limit to the other is max − min.
 * UNSURE: with stackTo 'axis' the full bonus is used for RSS as well (each
 * row ±3σ), which is conservative: the bonus follows the actual size,
 * itself spread about its mean. Stacked to the surface (surfaceBoundary)
 * the size and the bonus are in one row, so they are no longer double
 * counted.
 */
export function bonusTolerance(tolerance: GeometricTolerance): number {
  const { materialCondition = 'rfs', featureSize } = tolerance
  return materialCondition === 'rfs' || !featureSize ? 0 : featureSize.max - featureSize.min
}

/**
 * Largest datum shift of a datum reference frame with datum features at MMB
 * or LMB: the datum feature may move on its fixed-size simulator by its
 * departure from that boundary, at most its size tolerance plus the
 * boundaryAllowance that puts the boundary at virtual condition (ASME
 * Y14.5-2018 §7, datum feature shift; ISO 2692:2021 MMR on datum features;
 * Fischer 2011; Drake ch. 9). This is a diametral (total) movement, so
 * along the stack it is ±shift/2. Each MMB/LMB datum with sizes adds its
 * own shift; datums without sizes are skipped.
 * UNSURE: summing the shifts of a secondary and a tertiary datum treats the
 * tertiary's movement as a translation; it is really a rotation about the
 * primary and secondary, so the translation seen at the stack depends on
 * the distances (conservative near the tertiary, not elsewhere).
 */
export function frameDatumShift(datums: readonly DatumReference[] | undefined): number {
  return (datums ?? []).reduce((sum, datum) => (datum.modifier === 'rmb' || !datum.size ? sum
    : sum + datum.size.max - datum.size.min + (datum.boundaryAllowance ?? 0)), 0)
}

/** Largest datum shift of a tolerance's frame (frameDatumShift of its datums). */
export const datumShift = (tolerance: Pick<GeometricTolerance, 'datums'>): number => frameDatumShift(tolerance.datums)

/** "A|B(M)|C(L)": a frame's datums in order, with MMB as (M) and LMB as (L); RMB plain. */
export function datumFrameText(datums: readonly DatumReference[] | undefined): string {
  return (datums ?? []).map((datum) => `${datum.letter.trim()}${datum.modifier === 'mmb' ? '(M)' : datum.modifier === 'lmb' ? '(L)' : ''}`).join('|')
}

/** The identity of a frame for "count its shift once": the optional frame name and the datums. */
export const datumFrameKey = (datums: readonly DatumReference[] | undefined, frame = ''): string =>
  `${frame.trim().toLowerCase()}#${datumFrameText(datums).toUpperCase()}`

/** The frame shifts at MMB/LMB: some datum has MMB or LMB. */
export const hasDatumBoundary = (datums: readonly DatumReference[] | undefined): boolean =>
  (datums ?? []).some((datum) => datum.modifier === 'mmb' || datum.modifier === 'lmb')

/**
 * A feature of size at Ⓜ or Ⓛ stacked to its surface (ASME Y14.5-2018 §5,
 * virtual and resultant condition; ISO 2692:2021, MMVS/LMVS; Fischer 2011,
 * virtual / resultant condition boundary method; Drake ch. 9). With MMC and
 * LMC the sizes at the two limits (diameters or widths), T = LMC − MMC in
 * size, t the zone:
 *
 *   Ⓜ hole:  VC = MMC − t (inner)      RC = LMC + t + T (outer)
 *   Ⓜ pin:   VC = MMC + t (outer)      RC = LMC − t − T (inner)
 *   Ⓛ hole:  VC = LMC + t (outer)      RC = MMC − t − T (inner)
 *   Ⓛ pin:   VC = LMC − t (inner)      RC = MMC + t + T (outer)
 *
 * The virtual condition is the feature at the modifier's size displaced the
 * most (t/2); the resultant condition is the feature at the other size limit
 * displaced the most with the full bonus ((t + T)/2). Every point of the
 * surface lies between VC/2 and RC/2 from the true position, so the
 * surface's distance from the axis is mean (VC + RC)/4 ± (|RC − VC|)/4. In
 * all four cases |RC − VC| = 2(t + T), so the half band is (t + T)/2, the
 * same width as the axis row with its bonus, but the radius row is no
 * longer needed: the size is inside the boundaries.
 *
 * Example (Ⓜ hole ⌀10.0 … 10.2, ⌀0.1): VC = 9.9, RC = 10.5, the surface
 * lies 4.95 … 5.25 from the true position.
 */
export function surfaceBoundary(tolerance: GeometricTolerance): SurfaceBoundary | null {
  const { stackTo = 'axis', materialCondition = 'rfs', featureSize, featureType, zone } = tolerance
  if (stackTo === 'axis' || materialCondition === 'rfs' || !featureSize || !featureType) return null
  const hole = featureType === 'internal'
  const mmcSize = hole ? featureSize.min : featureSize.max
  const lmcSize = hole ? featureSize.max : featureSize.min
  const sizeTolerance = featureSize.max - featureSize.min
  // Displacing a pin sweeps a larger envelope (+), a hole leaves a smaller clear opening (−).
  const outwards = hole ? -1 : 1
  const [virtualCondition, resultantCondition] = materialCondition === 'mmc'
    ? [mmcSize + outwards * zone, lmcSize - outwards * (zone + sizeTolerance)]
    : [lmcSize - outwards * zone, mmcSize + outwards * (zone + sizeTolerance)]
  return {
    side: stackTo === 'near-surface' ? -1 : 1,
    virtualCondition,
    resultantCondition,
    innerRadius: Math.min(virtualCondition, resultantCondition) / 2,
    outerRadius: Math.max(virtualCondition, resultantCondition) / 2,
    nominalRadius: (featureSize.min + featureSize.max) / 4,
  }
}

/**
 * The part of the zone on the + side of the stacked dimension: zone/2
 * equally disposed; with Ⓤ/UZ the share on the material side goes to + when
 * adding material makes the dimension larger, to − otherwise
 * (ASME Y14.5-2018 §11; ISO 1101:2017 UZ). Seated on its high points
 * (flatness, straightness): 0 on the side away from the material, the whole
 * zone into it.
 */
export function plusShare(tolerance: GeometricTolerance): number {
  const { unequal, zone, highPoints } = tolerance
  if (highPoints && GEOMETRIC_RULES[tolerance.characteristic].highPoints) return highPoints.materialSide === 'larger' ? 0 : zone
  if (!unequal || !isProfile(tolerance.characteristic)) return zone / 2
  return unequal.materialSide === 'larger' ? unequal.value : zone - unequal.value
}

/** One line per modifier in the frame: what it does to this row of the stack, with its source. The numbers are in GeometricBreakdown. */
export function modifierNotes(tolerance: GeometricTolerance, standard: DrawingStandard = 'iso'): readonly string[] {
  const notes: string[] = []
  const iso = standard === 'iso'
  const condition = tolerance.materialCondition ?? 'rfs'
  if (condition !== 'rfs') {
    // ISO 2692:2021 speaks of the maximum / least material size (MMS/LMS); ASME Y14.5-2018 of MMC/LMC.
    const symbol = condition === 'mmc' ? `Ⓜ ${iso ? 'MMR' : 'MMC'}` : `Ⓛ ${iso ? 'LMR' : 'LMC'}`
    const from = iso ? (condition === 'mmc' ? 'MMS' : 'LMS') : condition.toUpperCase()
    const surface = surfaceBoundary(tolerance)
    notes.push(surface
      ? `${symbol}, stacked to the ${surface.side < 0 ? 'near' : 'far'} surface: the surface lies between half the virtual condition `
        + `and half the resultant condition from the true position, which covers both the size and the bonus in this one row `
        + `(${SOURCE.asme} §5; ${SOURCE.iso2692}; ${SOURCE.fischer}).`
      : `${symbol}: the zone grows by the feature's departure from ${from}, up to its size tolerance; `
        + `the largest bonus is added to the zone (${SOURCE.asme} §10; ${SOURCE.iso2692}; ${SOURCE.drakeStacks}).`)
  }
  for (const datum of tolerance.datums ?? []) {
    if (datum.modifier === 'rmb') continue
    const name = iso ? (datum.modifier === 'mmb' ? 'Ⓜ (MMR)' : 'Ⓛ (LMR)') : datum.modifier.toUpperCase()
    notes.push(`Datum ${datum.letter} at ${name}: recorded; the part may shift on the datum simulator by the datum feature's departure from its boundary. `
      + 'That shift is not in this row: add one datum-shift row for this frame where the chain crosses the interface of the datum feature '
      + `(${SOURCE.asme} §7; ${SOURCE.iso2692}; ${SOURCE.fischer}).`)
  }
  if (tolerance.unequal && isProfile(tolerance.characteristic)) {
    notes.push(`${iso ? 'UZ' : 'Ⓤ'} unequally disposed: the zone is ${iso ? 'offset from' : 'split unequally about'} the true profile, which moves the mean `
      + `of this row; the band stays the zone wide (${SOURCE.asme} §11; ${SOURCE.iso1101}).`)
  }
  if (tolerance.highPoints && GEOMETRIC_RULES[tolerance.characteristic].highPoints) {
    notes.push('Seats on its high points: the location of this surface in the chain is that of its high points, so the point the stack passes '
      + 'through lies between them and t into the material: one-sided 0 / −t into the material instead of ±t/2 '
      + `(${SOURCE.fischer}; ${SOURCE.drakeStacks}).`
      + (iso ? '' : ` Under ASME Rule #1 (${SOURCE.asme} §5), if this feature's size is already in the chain its form is inside that size: leave this row out.`))
  }
  if (tolerance.projected) {
    notes.push('Ⓟ projected zone: recorded; the zone applies above the part, where the mating part sits, and the stack passing there '
      + 'sees it as stated. Without Ⓟ, an axis tilted inside a zone t over the feature length L would be off by up to (t/2)(1 + 2P/L) '
      + `at a height P beyond it (${SOURCE.asme} §10; ${SOURCE.iso1101}).`)
  }
  if (tolerance.freeState) {
    notes.push('Ⓕ free state: recorded; a rigid 1D stack is unchanged. The tolerance applies with the part unrestrained, and a stack '
      + `of restrained, assembled parts does not see free-state distortion (${SOURCE.asme}; ${SOURCE.iso10579}).`)
  }
  if (tolerance.tangentPlane) {
    notes.push('Ⓣ tangent plane: recorded; a rigid 1D stack is unchanged. Only the plane touching the high points must lie in the zone, '
      + `and that plane is where a mating part rests; the surface's own form is not added (${SOURCE.asme}; ${SOURCE.iso1101}).`)
  }
  if (tolerance.commonZone) {
    notes.push('CZ combined zone: recorded; a rigid 1D stack is unchanged. Several features share one zone, so their variations are linked; '
      + `the engine treats every row as independent, which overstates RSS if two features of one zone are in this chain (${SOURCE.iso1101}).`)
  }
  return notes
}

const BONUS_UNSURE = 'Ⓜ/Ⓛ: the largest bonus is used for RSS too (conservative). To go on to the feature surface, '
  + 'choose "stack to the feature surface" rather than adding a radius row, which would count up to half the size tolerance twice.'
const SURFACE_UNSURE = 'Stacked to the surface: the band runs between the virtual and resultant conditions; RSS treats it as one '
  + 'normal row ±3σ over that band, which is conservative for a size and a bonus that move together.'

/**
 * A geometric tolerance as a deviation band about the row's nominal:
 *
 * - stacked to the axis (default): from lower to upper, upper − lower =
 *   effective zone (zone + largest bonus). Equally disposed: ±effective
 *   zone/2. Profile with Ⓤ/UZ and p on the + side: from −(zone − p) to +p
 *   (profile takes no bonus). Seated on the high points: 0/−t into the
 *   material.
 * - stacked to a surface (surfaceBoundary): the row's nominal moves by
 *   nominalOffset = side × nominalRadius from the basic location of the
 *   axis, and the band runs from the inner to the outer boundary radius
 *   about it.
 *
 * MMB/LMB datum shift is not in this band: it is its own row
 * (datumShiftDeviations); breakdown.frameDatumShift says how large it is.
 * The input is validated first (validate.ts).
 */
export function geometricDeviations(tolerance: GeometricTolerance, standard: DrawingStandard = 'iso'): {
  readonly upper: number; readonly lower: number; readonly nominalOffset: number
  readonly conversion: Conversion; readonly breakdown: GeometricBreakdown
} {
  const rule = geometricRule(tolerance.characteristic, standard)
  const bonus = bonusTolerance(tolerance)
  const surface = surfaceBoundary(tolerance)
  const breakdown: GeometricBreakdown = {
    zone: tolerance.zone, bonus, datumShift: 0, effectiveZone: tolerance.zone + bonus,
    frameDatumShift: datumShift(tolerance), surface,
  }
  const modifiers = modifierNotes(tolerance, standard)
  if (surface) {
    const { side, innerRadius, outerRadius, nominalRadius } = surface
    return {
      // side +1: basic + r, r from inner to outer; side −1: basic − r.
      upper: side > 0 ? outerRadius - nominalRadius : nominalRadius - innerRadius,
      lower: side > 0 ? innerRadius - nominalRadius : nominalRadius - outerRadius,
      nominalOffset: side * nominalRadius,
      conversion: {
        rule: `${rule.name.toLowerCase()} ${tolerance.materialCondition === 'mmc' ? 'Ⓜ' : 'Ⓛ'} to the ${side < 0 ? 'near' : 'far'} surface → `
          + 'between VC/2 and RC/2 from the true position: (VC + RC)/4 ± (t + T)/2',
        source: `${SOURCE.asme} §5, §10; ${SOURCE.iso2692}; ${SOURCE.fischer}; ${SOURCE.drakeStacks}`,
        appliesWhen: SURFACE_APPLIES, unsure: SURFACE_UNSURE, modifiers,
      },
      breakdown,
    }
  }
  const plus = plusShare(tolerance)
  const unsure = [rule.unsure, bonus > 0 ? BONUS_UNSURE : null].filter((text) => text !== null)
  return {
    upper: plus + bonus / 2,
    lower: plus - tolerance.zone - bonus / 2,
    nominalOffset: 0,
    conversion: {
      rule: rule.rule, source: rule.source, appliesWhen: rule.appliesWhen,
      unsure: unsure.length > 0 ? unsure.join(' ') : null,
      modifiers,
    },
    breakdown,
  }
}

/** A value for note text, without floating-point noise (0.1 rather than 0.10000000000000142). */
function noteNumber(value: number): string {
  return String(Number(value.toPrecision(10)))
}

/**
 * The datum shift of one frame as its own row: ±shift/2 about 0, where shift
 * is the largest movement of the part on its MMB/LMB datum simulators
 * (frameDatumShift; ASME Y14.5-2018 §7; ISO 2692:2021; Fischer 2011;
 * Drake ch. 9). It belongs in the chain once per datum reference frame, and
 * only where the chain crosses the interface of the datum feature with its
 * mating part or fixture: every feature located in that frame moves with
 * the part, so between two features of the one part the shift cancels.
 */
export function datumShiftDeviations(datums: readonly DatumReference[], standard: DrawingStandard = 'iso'): {
  readonly upper: number; readonly lower: number; readonly conversion: Conversion; readonly breakdown: GeometricBreakdown
} {
  const shift = frameDatumShift(datums)
  const iso = standard === 'iso'
  const modifiers = datums.filter((datum) => datum.modifier !== 'rmb' && datum.size).map((datum) => {
    const name = iso ? (datum.modifier === 'mmb' ? 'Ⓜ (MMR)' : 'Ⓛ (LMR)') : datum.modifier.toUpperCase()
    const tolerance = (datum.size?.max ?? 0) - (datum.size?.min ?? 0)
    return `Datum ${datum.letter} at ${name}: shift up to its size tolerance ${noteNumber(tolerance)}`
      + `${datum.boundaryAllowance ? ` plus its own geometric tolerance ${noteNumber(datum.boundaryAllowance)} (boundary at virtual condition)` : ''}.`
  })
  // Precedence is the order in the frame: index 2 is the tertiary datum.
  const tertiary = datums[2]
  const rotation = tertiary && tertiary.modifier !== 'rmb'
    ? `The tertiary datum ${tertiary.letter} only stops the part rotating about the primary and secondary: its shift is really a rotation, `
      + 'and adding it as a translation is conservative near that datum feature and may understate far beyond it.'
    : null
  return {
    upper: shift / 2,
    lower: -shift / 2,
    conversion: {
      rule: `datum shift of ${datumFrameText(datums)} → ±shift/2, shift = Σ (size tolerance + own geometric tolerance) of the MMB/LMB datums`,
      source: `${SOURCE.asme} §7; ${SOURCE.iso2692}; ${SOURCE.fischer}; ${SOURCE.drakeStacks}`,
      appliesWhen: 'Once per datum reference frame, where the chain crosses the interface between the datum feature and its mating part or fixture. '
        + 'Not between two features of the same part located in this frame: they shift together.',
      unsure: rotation,
      modifiers,
    },
    breakdown: { zone: 0, bonus: 0, datumShift: shift, effectiveZone: shift, frameDatumShift: shift, surface: null },
  }
}
