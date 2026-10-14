import { SOURCE } from './sources'
import type { Conversion, DrawingStandard, GeometricBreakdown, GeometricCharacteristic, GeometricTolerance } from './types'

/**
 * Geometric tolerances in a one-dimensional stack.
 *
 * A geometric tolerance defines a zone t wide (or ⌀t) in which the surface,
 * axis or centre plane must lie. Where the stack passes through that
 * feature, the point can sit anywhere in the zone, so along the stack
 * direction it contributes the zone as an equal bilateral ±t/2 about the
 * basic (nominal) position: the standard loop-diagram rule (Drake ch. 9).
 * ⌀t and a zone t wide give the same ±t/2 along one direction.
 *
 * Modifiers that change the band: Ⓜ/Ⓛ bonus and MMB/LMB datum shift widen
 * it, Ⓤ/UZ moves its mean. Modifiers recorded and explained, with no change
 * to a rigid 1D stack: Ⓟ, Ⓕ, Ⓣ, CZ (modifierNotes below).
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
}

const BOTH = { iso: true, asme: true } as const
const NEITHER = { iso: false, asme: false } as const
const ISO_ONLY = { iso: true, asme: false } as const

/**
 * When a form tolerance belongs in the chain. ASME Y14.5-2018 Rule #1
 * (envelope principle) keeps the form of a feature of size within its
 * size tolerance; ISO 8015:2011 (independency principle) does not, unless
 * the size carries Ⓔ.
 */
const FORM_APPLIES: Readonly<Record<DrawingStandard, string>> = {
  iso: 'Only where the stack passes through a point of this surface that no other tolerance in the chain already bounds. '
    + 'Under ISO 8015 (independency) form is not inside the size tolerance unless the size carries Ⓔ, so on a feature of size without Ⓔ it adds to the size.',
  asme: 'Only where the stack passes through a point of this surface that no other tolerance in the chain already bounds. '
    + 'Rule #1 (envelope) keeps the form of a feature of size inside its size tolerance, so do not add it to a size already in the chain.',
}

const FORM_UNSURE = 'Centred ±t/2 is the convention for a point anywhere on the surface. '
  + 'A face that rests on its high points against a flat mating face sits on the edge of the zone instead (0 to −t, one-sided).'

const ORIENTATION_APPLIES = 'Only where the location of this feature is not already in the chain at the point the stack passes through: '
  + 'an orientation tolerance refines a location tolerance and lies inside it. '
  + 'Typical case: a feature located at one place (a pin positioned at its base) and the stack passing at another (the tip of the pin).'

const ORIENTATION_UNSURE = 'Treating the whole zone t as ±t/2 at the point of the stack is conservative: '
  + 'the tilt actually seen depends on where along the feature the stack passes, which a 1D stack does not model.'

const PROFILE_RULE = 'profile t → ±t/2 equally disposed; Ⓤ/UZ: mean shifted by (share on the + side − t/2), ±t/2 about it'

const RUNOUT_APPLIES = 'Radial runout: the stack passes through the surface or its axis in a radial direction. '
  + 'Axial (face) runout: the stack runs along the datum axis through that face.'

const ORIENTATION = { materialCondition: BOTH, diameterZone: true, datums: true, datumBoundary: true, projected: true } as const
const FORM_FLAGS = { datums: false, datumBoundary: false, projected: false } as const
const PROFILE = { materialCondition: NEITHER, diameterZone: false, datums: true, datumBoundary: true, projected: false } as const
const RUNOUT = { materialCondition: NEITHER, diameterZone: false, datums: true, datumBoundary: false, projected: false } as const

/** appliesWhen of flatness and straightness is FORM_APPLIES for the drawing standard, see geometricRule. */
export const GEOMETRIC_RULES: Readonly<Record<GeometricCharacteristic, GeometricRule>> = {
  // The axis or centre plane lies in a zone ⌀t (or t wide) centred on the
  // true position (ASME Y14.5-2018 §10; ISO 1101:2017 position). Along any
  // one direction the offset is at most t/2 either way.
  position: {
    name: 'Position', symbol: '⌖', rule: 'position ⌀t (or t wide) → ±t/2 on the axis or centre plane',
    appliesWhen: 'The stack passes through the axis or centre plane of the feature, located by a basic dimension. '
      + 'To reach a surface of the feature, add half its size as a separate row (radius or half-width, with half the size tolerance).',
    source: `${SOURCE.asme} §10; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null,
    materialCondition: BOTH, diameterZone: true, datums: true, datumBoundary: true, projected: true,
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
  'profile-line': {
    name: 'Profile of a line', symbol: '⌒', rule: PROFILE_RULE,
    appliesWhen: 'The stack passes through the cross-section the line profile controls, and the profile is related to datums.',
    source: `${SOURCE.asme} §11; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`,
    unsure: 'A line profile controls each cross-section separately, not the surface as a whole; '
      + 'it is treated like a surface profile at the section the stack passes through.',
    ...PROFILE,
  },
  // The surface lies between two parallel planes t apart (ASME Y14.5-2018 §8;
  // ISO 1101:2017 flatness). Ⓜ/Ⓛ only on the derived median plane of a feature of size.
  flatness: {
    name: 'Flatness', symbol: '⏥', rule: 'flatness t → ±t/2 about the nominal position of the surface',
    appliesWhen: FORM_APPLIES.iso, source: `${SOURCE.asme} §8; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: FORM_UNSURE,
    materialCondition: BOTH, diameterZone: false, ...FORM_FLAGS,
  },
  // Line elements (or the derived median line) lie between two lines t apart
  // or in a cylinder ⌀t (ASME Y14.5-2018 §8; ISO 1101:2017 straightness).
  straightness: {
    name: 'Straightness', symbol: '⏤', rule: 'straightness t → ±t/2 about the nominal position of the line or axis',
    appliesWhen: FORM_APPLIES.iso, source: `${SOURCE.asme} §8; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: FORM_UNSURE,
    materialCondition: BOTH, diameterZone: true, ...FORM_FLAGS,
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
  // e gives FIM = 2e, so e ≤ t/2; axially, the face points span at most t.
  'circular-runout': {
    name: 'Circular runout', symbol: '↗', rule: 'runout t (FIM) → ±t/2: axis offset e = FIM/2, or face position ±t/2',
    appliesWhen: RUNOUT_APPLIES, source: `${SOURCE.asme} §12; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null, ...RUNOUT,
  },
  'total-runout': {
    name: 'Total runout', symbol: '⌰', rule: 'total runout t (FIM) → ±t/2: axis offset e = FIM/2, or face position ±t/2',
    appliesWhen: RUNOUT_APPLIES, source: `${SOURCE.asme} §12; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null, ...RUNOUT,
  },
  // The axis lies in a cylinder ⌀t coaxial with the datum axis (ISO 1101:2017
  // coaxiality). ASME concentricity (median points in ⌀t) is in Y14.5-2009
  // and was removed in Y14.5-2018 (position or runout replace it).
  coaxiality: {
    name: 'Coaxiality / concentricity', symbol: '◎', rule: 'coaxiality ⌀t → ±t/2 offset of the axis',
    appliesWhen: 'The stack passes through the axis (or the surface, with half the diameter as a separate row) in a radial direction.',
    source: `${SOURCE.iso1101}; ${SOURCE.asme2009} (concentricity); ${SOURCE.drakeStacks}`, unsure: null,
    materialCondition: ISO_ONLY, diameterZone: true, datums: true, datumBoundary: true, projected: false,
  },
  // The median (centre) plane lies between two planes t apart, symmetric about
  // the datum centre plane (ISO 1101:2017; ASME Y14.5-2009, removed in 2018).
  symmetry: {
    name: 'Symmetry', symbol: '⌯', rule: 'symmetry t → ±t/2 offset of the centre plane',
    appliesWhen: 'The stack passes through the centre plane of the feature (or a face, with half the width as a separate row).',
    source: `${SOURCE.iso1101}; ${SOURCE.asme2009}; ${SOURCE.drakeStacks}`, unsure: null,
    materialCondition: ISO_ONLY, diameterZone: false, datums: true, datumBoundary: true, projected: false,
  },
}

export const GEOMETRIC_CHARACTERISTICS = Object.keys(GEOMETRIC_RULES) as readonly GeometricCharacteristic[]

/** The rule of a characteristic, with the inclusion text of form tolerances worded for the drawing standard. */
export function geometricRule(characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso'): GeometricRule {
  const rule = GEOMETRIC_RULES[characteristic]
  return characteristic === 'flatness' || characteristic === 'straightness' ? { ...rule, appliesWhen: FORM_APPLIES[standard] } : rule
}

/** Ⓜ/Ⓛ can be put on this characteristic under this standard. */
export const acceptsMaterialCondition = (characteristic: GeometricCharacteristic, standard: DrawingStandard = 'iso') =>
  GEOMETRIC_RULES[characteristic].materialCondition[standard]

/** The zone can carry ⌀. */
export const acceptsDiameterZone = (characteristic: GeometricCharacteristic) => GEOMETRIC_RULES[characteristic].diameterZone

export const isProfile = (characteristic: GeometricCharacteristic) =>
  characteristic === 'profile-surface' || characteristic === 'profile-line'

/**
 * Largest bonus tolerance from Ⓜ or Ⓛ on the tolerance: the zone grows by
 * the feature's departure from MMC (Ⓜ) or LMC (Ⓛ), at most the whole size
 * tolerance (max − min) when the feature is at the opposite limit
 * (ASME Y14.5-2018 §10, bonus tolerance; ISO 2692:2021 MMR/LMR; Drake ch. 9).
 * Whether the feature is a hole or a pin does not change this: either way
 * the departure from one limit to the other is max − min.
 * UNSURE: the full bonus is used for RSS as well (each row ±3σ), which is
 * conservative: the bonus follows the actual size, itself spread about its
 * mean. And when the chain goes on to the feature's surface through a
 * separate radius row (size/2 ± T/4), the near side is bounded by the
 * virtual condition, so that side of the band is wider than reality by T/2.
 */
export function bonusTolerance(tolerance: GeometricTolerance): number {
  const { materialCondition = 'rfs', featureSize } = tolerance
  return materialCondition === 'rfs' || !featureSize ? 0 : featureSize.max - featureSize.min
}

/**
 * Largest datum shift from datum features referenced at MMB or LMB: the
 * datum feature may move on its fixed-size simulator by its departure from
 * that boundary, at most its size tolerance plus the boundaryAllowance that
 * puts the boundary at virtual condition (ASME Y14.5-2018 §7, datum feature
 * shift; ISO 2692:2021 MMR on datum features; Drake ch. 9). This is a
 * diametral (total) movement, so it widens the band like the zone does:
 * ±shift/2 along the stack. Each MMB/LMB datum adds its own shift.
 * UNSURE: the shift moves the whole pattern relative to the datum, so it
 * is conservative to add it to every row: two features of one pattern in
 * the same chain shift together and the shift cancels between them. It
 * applies only when the chain passes through the datum feature (its
 * mating part or simulator); summing the shifts of a secondary and a
 * tertiary datum treats the tertiary's rotation as a translation.
 */
export function datumShift(tolerance: GeometricTolerance): number {
  return (tolerance.datums ?? []).reduce((sum, datum) => (datum.modifier === 'rmb' || !datum.size ? sum
    : sum + datum.size.max - datum.size.min + (datum.boundaryAllowance ?? 0)), 0)
}

const BONUS_UNSURE = 'Ⓜ/Ⓛ: the largest bonus is used for RSS too (conservative), and a separate radius row to the feature surface '
  + 'double-counts up to half the size tolerance on the virtual-condition side.'
const SHIFT_UNSURE = 'MMB/LMB: the datum shift is added to this row alone; features of one pattern shift together, '
  + 'and the shift applies only if the chain passes through the datum feature.'

/**
 * The part of the zone on the + side of the stacked dimension: zone/2
 * equally disposed; with Ⓤ/UZ the share on the material side goes to + when
 * adding material makes the dimension larger, to − otherwise
 * (ASME Y14.5-2018 §11; ISO 1101:2017 UZ).
 */
export function plusShare(tolerance: GeometricTolerance): number {
  const { unequal, zone } = tolerance
  if (!unequal || !isProfile(tolerance.characteristic)) return zone / 2
  return unequal.materialSide === 'larger' ? unequal.value : zone - unequal.value
}

/** One line per modifier in the frame: what it does to this row of the stack, with its source. The numbers are in GeometricBreakdown. */
export function modifierNotes(tolerance: GeometricTolerance, standard: DrawingStandard = 'iso'): readonly string[] {
  const notes: string[] = []
  const iso = standard === 'iso'
  const condition = tolerance.materialCondition ?? 'rfs'
  if (condition !== 'rfs') {
    const symbol = condition === 'mmc' ? `Ⓜ ${iso ? 'MMR' : 'MMC'}` : `Ⓛ ${iso ? 'LMR' : 'LMC'}`
    notes.push(`${symbol}: the zone grows by the feature's departure from ${condition.toUpperCase()}, up to its size tolerance; `
      + `the largest bonus is added to the zone (${SOURCE.asme} §10; ${SOURCE.iso2692}; ${SOURCE.drakeStacks}).`)
  }
  for (const datum of tolerance.datums ?? []) {
    if (datum.modifier === 'rmb') continue
    const name = iso ? (datum.modifier === 'mmb' ? 'Ⓜ (MMR)' : 'Ⓛ (LMR)') : datum.modifier.toUpperCase()
    notes.push(`Datum ${datum.letter} at ${name}: the part may shift on the datum simulator by the datum feature's departure from its boundary, `
      + `up to its size tolerance${datum.boundaryAllowance ? ' plus its own geometric tolerance' : ''}; `
      + `the largest shift is added to the zone (${SOURCE.asme} §7; ${SOURCE.iso2692}; ${SOURCE.drakeStacks}).`)
  }
  if (tolerance.unequal && isProfile(tolerance.characteristic)) {
    notes.push(`${iso ? 'UZ' : 'Ⓤ'} unequally disposed: the zone is split unequally about the true profile, which moves the mean `
      + `of this row; the band stays the zone wide (${SOURCE.asme} §11; ${SOURCE.iso1101}).`)
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

/**
 * A geometric tolerance as a deviation band about the nominal (basic)
 * dimension: from lower to upper, upper − lower = effective zone
 * (zone + largest bonus + largest datum shift). Equally disposed:
 * ±effective zone/2. Profile with Ⓤ/UZ and p on the + side: from
 * −(zone − p) to +p, widened by half the datum shift either side (profile
 * takes no bonus). The input is validated first (validate.ts).
 */
export function geometricDeviations(tolerance: GeometricTolerance, standard: DrawingStandard = 'iso'): {
  readonly upper: number; readonly lower: number; readonly conversion: Conversion; readonly breakdown: GeometricBreakdown
} {
  const rule = geometricRule(tolerance.characteristic, standard)
  const bonus = bonusTolerance(tolerance)
  const shift = datumShift(tolerance)
  const plus = plusShare(tolerance)
  const unsure = [rule.unsure, bonus > 0 ? BONUS_UNSURE : null, shift > 0 ? SHIFT_UNSURE : null].filter((text) => text !== null)
  return {
    upper: plus + (bonus + shift) / 2,
    lower: plus - tolerance.zone - (bonus + shift) / 2,
    conversion: {
      rule: rule.rule, source: rule.source, appliesWhen: rule.appliesWhen,
      unsure: unsure.length > 0 ? unsure.join(' ') : null,
      modifiers: modifierNotes(tolerance, standard),
    },
    breakdown: { zone: tolerance.zone, bonus, datumShift: shift, effectiveZone: tolerance.zone + bonus + shift },
  }
}
