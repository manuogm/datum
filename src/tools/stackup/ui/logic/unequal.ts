// Ⓤ / UZ, the unequally disposed profile zone, in the two ways a drawing
// gives it (B1 of the mechanical review):
//
//   ASME Y14.5-2018 §11 (Ⓤ):  the Ⓤ value is the part of the zone on the
//                             side that adds material, 0 … t.
//   ISO 1101:2017 (UZ):       the offset of the zone's centre from the true
//                             profile, + towards the outside of the material.
//
// For a profile tolerance t the two are tied by  Ⓤ value = t/2 + UZ offset.
// The row stores the number as the engineer typed it, with the form it was
// typed in (GeometricEntry.unequal.typedAs). The engine's Ⓤ value is worked
// out from it only when the engine input is built, with the zone as it is
// then: so typing the offset before the zone, or changing the zone after,
// keeps what the drawing says.
import type { DrawingStandard } from '../../calc'
import type { GeometricEntry, UnequalForm } from '../state/stackInputs'

/** An ISO UZ offset v as the Ⓤ value the engine takes: t/2 + v. */
export const unequalValueFromOffset = (zone: number, offset: number): number => zone / 2 + offset
/** A Ⓤ value as an ISO UZ offset: value − t/2. */
export const offsetFromUnequalValue = (zone: number, value: number): number => value - zone / 2

/** The form a drawing of this standard gives the number in. */
export const unequalFormOf = (standard: DrawingStandard): UnequalForm => (standard === 'iso' ? 'iso-offset' : 'asme-value')

/** The Ⓤ value the engine takes (the share of the zone on the side that adds material); null while the zone or the number is not entered. */
export function unequalEngineValue(entry: Pick<GeometricEntry, 'zone' | 'unequal'>): number | null {
  const { zone, unequal } = entry
  if (unequal.value === null) return null
  if (unequal.typedAs === 'asme-value') return unequal.value
  return zone === null ? null : unequalValueFromOffset(zone, unequal.value)
}

/**
 * The number the field and the frame show on a drawing of this standard: as
 * typed when it was typed in this standard's form, else worked out with the
 * current zone (null until the zone is entered).
 */
export function unequalShown(entry: Pick<GeometricEntry, 'zone' | 'unequal'>, standard: DrawingStandard): number | null {
  const { zone, unequal } = entry
  if (unequal.value === null || unequal.typedAs === unequalFormOf(standard)) return unequal.value
  if (zone === null) return null
  return unequal.typedAs === 'asme-value' ? offsetFromUnequalValue(zone, unequal.value) : unequalValueFromOffset(zone, unequal.value)
}

/**
 * The entry on a drawing of another standard: the number re-expressed in
 * that standard's form with the current zone, so it keeps meaning the same
 * zone. Left as typed while the zone is not entered (it cannot be converted
 * yet; the engine still reads it in the form it was typed in).
 */
export function unequalInStandard(entry: GeometricEntry, standard: DrawingStandard): GeometricEntry {
  const form = unequalFormOf(standard)
  const { unequal, zone } = entry
  if (unequal.typedAs === form || (unequal.value !== null && zone === null)) return entry
  const value = unequalShown(entry, standard)
  // 12 significant digits: 0.3/2 + 0.05 is 0.2 on the drawing, not 0.20000000000000001.
  return { ...entry, unequal: { ...unequal, typedAs: form, value: value === null ? null : Number(value.toPrecision(12)) } }
}
