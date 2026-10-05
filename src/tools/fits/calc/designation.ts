import { isDeviationLetter, letterSymbol, type DeviationLetter, type ZoneKind } from './letters'
import { fail, ok, type Result } from '../../../core/result'
import { isToleranceGrade, type ToleranceGrade } from './toleranceGrades'

/** A tolerance class such as H7 or g6, without a size (ISO 286-1:2010 tolerance class). */
export interface ZoneSpec {
  readonly kind: ZoneKind
  readonly letter: DeviationLetter
  readonly grade: ToleranceGrade
}

/** A fit designation such as H7/g6: hole class first, shaft class second (ISO 286-1:2010 fit designation). */
export interface FitSpec {
  readonly hole: ZoneSpec
  readonly shaft: ZoneSpec
}

/** 'H7', 'js6', 'ZC11' … */
export function formatZone(zone: ZoneSpec): string {
  return `${letterSymbol(zone.kind, zone.letter)}${zone.grade}`
}

/** 'H7/g6' */
export function formatFit(fit: FitSpec): string {
  return `${formatZone(fit.hole)}/${formatZone(fit.shaft)}`
}

/**
 * Builds a ZoneSpec from separate inputs, accepting the grade with or without
 * "IT" ('7', 'IT7', 7). The letter may be typed in either case: `kind` decides.
 */
export function zoneSpec(kind: ZoneKind, letter: string, grade: string | number): Result<ZoneSpec> {
  const letterLower = letter.trim().toLowerCase()
  const gradeText = String(grade).trim().toUpperCase().replace(/^IT/, '')
  if (!isDeviationLetter(letterLower)) {
    return fail(`"${letter}" is not an ISO 286 fundamental deviation letter.`)
  }
  if (!isToleranceGrade(gradeText)) {
    return fail(`"${grade}" is not a standard tolerance grade (IT01, IT0, IT1 … IT18).`)
  }
  return ok({ kind, letter: letterLower, grade: gradeText })
}

/**
 * Parses a tolerance class such as 'H7' (hole: upper case) or 'g6' (shaft: lower case).
 */
export function parseZone(text: string): Result<ZoneSpec> {
  const match = /^\s*([A-Za-z]{1,2})\s*(\d{1,2})\s*$/.exec(text)
  if (!match) {
    return fail(`"${text}" is not a tolerance class. Write a letter followed by a grade, e.g. H7 or g6.`)
  }
  const [, letter, grade] = match
  const isHole = letter === letter.toUpperCase()
  const isShaft = letter === letter.toLowerCase()
  if (!isHole && !isShaft) {
    return fail(`"${text}": use upper case for holes (JS7) and lower case for shafts (js6), not a mix.`)
  }
  return zoneSpec(isHole ? 'hole' : 'shaft', letter, grade)
}

/** Parses a fit designation such as 'H7/g6' or 'G7/h6' (hole class / shaft class). */
export function parseFitDesignation(text: string): Result<FitSpec> {
  const parts = text.split('/')
  if (parts.length !== 2) {
    return fail(`"${text}" is not a fit designation. Write hole class / shaft class, e.g. H7/g6.`)
  }
  const hole = parseZone(parts[0])
  const shaft = parseZone(parts[1])
  if (!hole.ok) return hole
  if (!shaft.ok) return shaft
  if (hole.value.kind !== 'hole' || shaft.value.kind !== 'shaft') {
    return fail(`"${text}": the hole class (upper case) comes first and the shaft class (lower case) second, e.g. H7/g6.`)
  }
  return ok({ hole: hole.value, shaft: shaft.value })
}
