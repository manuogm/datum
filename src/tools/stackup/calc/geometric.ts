import { SOURCE } from './sources'
import type { Conversion, GeometricCharacteristic, GeometricTolerance } from './types'

/**
 * Geometric tolerances in a one-dimensional stack.
 *
 * A geometric tolerance defines a zone t wide (or ⌀t) in which the surface,
 * axis or centre plane must lie. Where the stack passes through that
 * feature, the point can sit anywhere in the zone, so along the stack
 * direction it contributes the zone as an equal bilateral ±t/2 about the
 * basic (nominal) position: the standard loop-diagram rule (Drake ch. 9).
 * Only profile can be unequally disposed, which shifts the mean.
 *
 * No MMC/LMC bonus tolerance in v1: the zone is the value in the frame,
 * whatever the size of the feature (spec DEFAULT).
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
}

/**
 * Inclusion guidance shared by flatness and straightness. ASME Y14.5-2018
 * Rule #1 (envelope principle) keeps the form of a feature of size within
 * its size tolerance; ISO 8015:2011 (independency principle) does not,
 * unless the size carries Ⓔ.
 */
const FORM_APPLIES = 'Only where the stack passes through a point of this surface that no other tolerance in the chain already bounds. '
  + 'On an ASME drawing the form of a feature of size is already inside its size tolerance (Rule #1), so do not add it there; '
  + 'on an ISO drawing (ISO 8015 independency) it is not, unless the size carries Ⓔ.'

const FORM_UNSURE = 'Centred ±t/2 is the convention for a point anywhere on the surface. '
  + 'A face that rests on its high points against a flat mating face sits on the edge of the zone instead (0 to −t, one-sided).'

const ORIENTATION_APPLIES = 'Only where the location of this feature is not already in the chain at the point the stack passes through: '
  + 'an orientation tolerance refines a location tolerance and lies inside it. '
  + 'Typical case: a feature located at one place (a pin positioned at its base) and the stack passing at another (the tip of the pin).'

const ORIENTATION_UNSURE = 'Treating the whole zone t as ±t/2 at the point of the stack is conservative: '
  + 'the tilt actually seen depends on where along the feature the stack passes, which a 1D stack does not model.'

const PROFILE_RULE = 'profile t → ±t/2 equally disposed; unequally disposed: mean shifted by (plus share − t/2), ±t/2 about it'

export const GEOMETRIC_RULES: Readonly<Record<GeometricCharacteristic, GeometricRule>> = {
  // The axis or centre plane lies in a zone ⌀t (or t wide) centred on the
  // true position (ASME Y14.5-2018 §10; ISO 1101:2017 position). Along any
  // one direction the offset is at most t/2 either way.
  position: {
    name: 'Position', symbol: '⌖', rule: 'position ⌀t (or t wide) → ±t/2 on the axis or centre plane',
    appliesWhen: 'The stack passes through the axis or centre plane of the feature, located by a basic dimension. '
      + 'To reach a surface of the feature, add half its size as a separate row (radius or half-width, with half the size tolerance).',
    source: `${SOURCE.asme} §10; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null,
  },
  // Every point of the surface lies within a zone t wide about the true
  // profile; equally disposed unless stated (ASME Y14.5-2018 §11, Ⓤ for
  // unequal; ISO 1101:2017, UZ modifier for an offset zone).
  'profile-surface': {
    name: 'Profile of a surface', symbol: '⌓', rule: PROFILE_RULE,
    appliesWhen: 'The profile is related to datums and so locates the surface the stack passes through. '
      + 'Without datums it controls form only: treat it as flatness.',
    source: `${SOURCE.asme} §11; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null,
  },
  'profile-line': {
    name: 'Profile of a line', symbol: '⌒', rule: PROFILE_RULE,
    appliesWhen: 'The stack passes through the cross-section the line profile controls, and the profile is related to datums.',
    source: `${SOURCE.asme} §11; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`,
    unsure: 'A line profile controls each cross-section separately, not the surface as a whole; '
      + 'it is treated like a surface profile at the section the stack passes through.',
  },
  // The surface lies between two parallel planes t apart (ASME Y14.5-2018 §8; ISO 1101:2017 flatness).
  flatness: {
    name: 'Flatness', symbol: '⏥', rule: 'flatness t → ±t/2 about the nominal position of the surface',
    appliesWhen: FORM_APPLIES, source: `${SOURCE.asme} §8; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: FORM_UNSURE,
  },
  // Line elements (or the derived median line) lie between two lines t apart
  // (or in a cylinder ⌀t) (ASME Y14.5-2018 §8; ISO 1101:2017 straightness).
  straightness: {
    name: 'Straightness', symbol: '⏤', rule: 'straightness t → ±t/2 about the nominal position of the line or axis',
    appliesWhen: FORM_APPLIES, source: `${SOURCE.asme} §8; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: FORM_UNSURE,
  },
  // The surface or axis lies within a zone t wide at the basic orientation to
  // the datum; the zone floats within the location tolerance (ASME Y14.5-2018 §9; ISO 1101:2017).
  parallelism: {
    name: 'Parallelism', symbol: '∥', rule: 'parallelism t → ±t/2 about the nominal position',
    appliesWhen: ORIENTATION_APPLIES, source: `${SOURCE.asme} §9; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: ORIENTATION_UNSURE,
  },
  perpendicularity: {
    name: 'Perpendicularity', symbol: '⊥', rule: 'perpendicularity t → ±t/2 about the nominal position',
    appliesWhen: ORIENTATION_APPLIES, source: `${SOURCE.asme} §9; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: ORIENTATION_UNSURE,
  },
  angularity: {
    name: 'Angularity', symbol: '∠', rule: 'angularity t → ±t/2 about the nominal position',
    appliesWhen: ORIENTATION_APPLIES, source: `${SOURCE.asme} §9; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: ORIENTATION_UNSURE,
  },
  // Runout t is a full indicator movement (FIM) while the part turns about the
  // datum axis (ASME Y14.5-2018 §12; ISO 1101:2017). Radially, an axis offset
  // e gives FIM = 2e, so e ≤ t/2; axially, the face points span at most t.
  'circular-runout': {
    name: 'Circular runout', symbol: '↗', rule: 'runout t (FIM) → ±t/2: axis offset e = FIM/2, or face position ±t/2',
    appliesWhen: 'Radial runout: the stack passes through the surface or its axis in a radial direction. '
      + 'Axial (face) runout: the stack runs along the datum axis through that face.',
    source: `${SOURCE.asme} §12; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null,
  },
  'total-runout': {
    name: 'Total runout', symbol: '⌰', rule: 'total runout t (FIM) → ±t/2: axis offset e = FIM/2, or face position ±t/2',
    appliesWhen: 'Radial: the stack passes through the surface or its axis in a radial direction. '
      + 'Axial: the stack runs along the datum axis through that face.',
    source: `${SOURCE.asme} §12; ${SOURCE.iso1101}; ${SOURCE.drakeStacks}`, unsure: null,
  },
  // The axis lies in a cylinder ⌀t coaxial with the datum axis (ISO 1101:2017
  // coaxiality). ASME concentricity (median points in ⌀t) is in Y14.5-2009
  // and was removed in Y14.5-2018 (position or runout replace it).
  coaxiality: {
    name: 'Coaxiality / concentricity', symbol: '◎', rule: 'coaxiality ⌀t → ±t/2 offset of the axis',
    appliesWhen: 'The stack passes through the axis (or the surface, with half the diameter as a separate row) in a radial direction.',
    source: `${SOURCE.iso1101}; ${SOURCE.asme2009} (concentricity); ${SOURCE.drakeStacks}`, unsure: null,
  },
  // The median (centre) plane lies between two planes t apart, symmetric about
  // the datum centre plane (ISO 1101:2017; ASME Y14.5-2009, removed in 2018).
  symmetry: {
    name: 'Symmetry', symbol: '⌯', rule: 'symmetry t → ±t/2 offset of the centre plane',
    appliesWhen: 'The stack passes through the centre plane of the feature (or a face, with half the width as a separate row).',
    source: `${SOURCE.iso1101}; ${SOURCE.asme2009}; ${SOURCE.drakeStacks}`, unsure: null,
  },
}

export const GEOMETRIC_CHARACTERISTICS = Object.keys(GEOMETRIC_RULES) as readonly GeometricCharacteristic[]

export const isProfile = (characteristic: GeometricCharacteristic) =>
  characteristic === 'profile-surface' || characteristic === 'profile-line'

/**
 * A geometric tolerance as a deviation band about the nominal (basic)
 * dimension: from lower to upper, upper − lower = zone. Equally disposed:
 * ±zone/2. Profile with a plus share p: from −(zone − p) to +p.
 * The input is validated first (validate.ts).
 */
export function geometricDeviations(tolerance: GeometricTolerance): { readonly upper: number; readonly lower: number; readonly conversion: Conversion } {
  const rule = GEOMETRIC_RULES[tolerance.characteristic]
  const plus = isProfile(tolerance.characteristic) ? tolerance.plusShare ?? tolerance.zone / 2 : tolerance.zone / 2
  return {
    upper: plus,
    lower: plus - tolerance.zone,
    conversion: { rule: rule.rule, source: rule.source, appliesWhen: rule.appliesWhen },
  }
}
