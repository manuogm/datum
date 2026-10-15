import {
  GEOMETRIC_RULES, acceptsCombinedZone, acceptsMaterialCondition, acceptsSurfaceBoundary, acceptsTangentPlane, datumFrameKey, datumFrameText,
  hasDatumBoundary, inStandard, isProfile,
} from './geometric'
import { MAX_CONTRIBUTORS } from './rules'
import type {
  Contributor, DatumReference, DatumShiftContributor, DrawingStandard, GeometricTolerance, PlainTolerance, Requirement, SizeLimits, StackInput,
  StackResult,
} from './types'

/**
 * Checks a stack input before any calculation. Returns a plain-English
 * explanation of the first problem found, naming the row, or null when the
 * input is usable.
 */
export function inputError(input: StackInput): string | null {
  return settingsError(input) ?? chainError(input) ?? requirementError(input.requirement)
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isNonNegative = (value: unknown) => isFiniteNumber(value) && value >= 0

/** "Row 3 "Bearing width"", or "Row 3" when the label is empty. */
export function rowName(contributor: Pick<Contributor, 'label'> | undefined, index: number): string {
  const label = typeof contributor?.label === 'string' ? contributor.label.trim() : ''
  return label ? `Row ${index + 1} "${label}"` : `Row ${index + 1}`
}

function settingsError(input: StackInput): string | null {
  if (input.method !== undefined && input.method !== 'worst-case' && input.method !== 'rss') return 'Choose a method: worst case or RSS.'
  if (input.standard !== undefined && input.standard !== 'iso' && input.standard !== 'asme') return 'Choose a drawing standard: ISO or ASME.'
  return null
}

function chainError({ contributors, standard = 'iso' }: StackInput): string | null {
  if (!Array.isArray(contributors) || contributors.length === 0) return 'Add at least one dimension to the chain.'
  if (contributors.length > MAX_CONTRIBUTORS) return `A chain can have at most ${MAX_CONTRIBUTORS} rows.`
  for (const [index, contributor] of contributors.entries()) {
    const error = contributorError(contributor, rowName(contributor, index), standard)
    if (error) return error
  }
  return null
}

function contributorError(contributor: Contributor, row: string, standard: DrawingStandard): string | null {
  if (contributor?.kind !== 'dimension' && contributor?.kind !== 'linked' && contributor?.kind !== 'datum-shift') {
    return `${row} must be a dimension, a linked part stack or a datum shift.`
  }
  // In 1D the coefficient is ±1 (or e.g. 0.5 for a radius from a diameter); 0 would drop the row.
  if (!(isFiniteNumber(contributor.sensitivity) && contributor.sensitivity !== 0)) return `${row} needs a direction (+1 or −1).`
  if (contributor.kind === 'linked') return linkedError(contributor.stack, row)
  if (contributor.kind === 'datum-shift') return datumShiftError(contributor, row)
  if (!isFiniteNumber(contributor.nominal)) return `${row} needs a nominal value.`
  if (contributor.statistical !== undefined && typeof contributor.statistical !== 'boolean') return `${row}: ⟨ST⟩ must be on or off.`
  const tolerance = contributor.tolerance
  if (tolerance?.kind === 'geometric') return geometricError(tolerance, row, standard)
  return plainError(tolerance, row)
}

function plainError(tolerance: PlainTolerance, row: string): string | null {
  switch (tolerance?.kind) {
    case 'symmetric':
      if (!isFiniteNumber(tolerance.plusMinus)) return `${row} needs a ± tolerance.`
      return tolerance.plusMinus >= 0 ? null : `${row}: a ± tolerance cannot be negative.`
    case 'deviations':
      if (!isFiniteNumber(tolerance.upper) || !isFiniteNumber(tolerance.lower)) return `${row} needs an upper and a lower deviation.`
      return tolerance.upper >= tolerance.lower ? null : `${row}: the upper deviation is below the lower one, which gives a negative tolerance band.`
    case 'limits':
      if (!isFiniteNumber(tolerance.min) || !isFiniteNumber(tolerance.max)) return `${row} needs a smallest and a largest size.`
      return tolerance.max >= tolerance.min ? null : `${row}: the largest size is below the smallest, which gives a negative tolerance band.`
    default:
      return `${row} needs a tolerance: ±, unequal deviations, limits or a geometric tolerance.`
  }
}

function sizeError(row: string, size: SizeLimits | undefined, what: string, purpose: string): string | null {
  if (!size || !isFiniteNumber(size.min) || !isFiniteNumber(size.max)) return `${row} needs the smallest and largest size of ${what}, for ${purpose}.`
  return size.max >= size.min ? null : `${row}: the largest size of ${what} is below the smallest.`
}

function geometricError(tolerance: GeometricTolerance, row: string, standard: DrawingStandard): string | null {
  const rule = GEOMETRIC_RULES[tolerance.characteristic]
  if (!rule) return `${row} needs a geometric characteristic.`
  const name = rule.name.toLowerCase()
  if (!isFiniteNumber(tolerance.zone)) return `${row} needs a ${name} tolerance value.`
  if (tolerance.zone < 0) return `${row}: a ${name} tolerance cannot be negative.`
  if (tolerance.diameterZone && !rule.diameterZone) return `${row}: a ${name} zone cannot carry ⌀.`
  const condition = tolerance.materialCondition ?? 'rfs'
  if (condition !== 'rfs' && condition !== 'mmc' && condition !== 'lmc') return `${row}: the material condition must be RFS, MMC or LMC.`
  if (condition !== 'rfs') {
    if (!acceptsMaterialCondition(tolerance.characteristic, standard)) {
      return `${row}: ${rule.name.toLowerCase()} cannot take ${condition === 'mmc' ? 'Ⓜ' : 'Ⓛ'} under ${standard === 'iso' ? 'ISO 2692' : 'ASME Y14.5-2018'}.`
    }
    const error = sizeError(row, tolerance.featureSize, 'the toleranced feature', 'the bonus tolerance')
    if (error) return error
  }
  const surfaceError = stackToError(tolerance, row, standard)
  if (surfaceError) return surfaceError
  for (const datum of tolerance.datums ?? []) {
    const error = datumError(datum, rule, row)
    if (error) return error
  }
  if (tolerance.unequal !== undefined) {
    if (!isProfile(tolerance.characteristic)) return `${row}: only a profile tolerance can be unequally disposed (Ⓤ / UZ).`
    const { value, materialSide } = tolerance.unequal
    if (!isFiniteNumber(value)) return `${row} needs ${standard === 'iso' ? 'a UZ offset' : 'a Ⓤ value'}.`
    // ASME Y14.5-2018 §11: the Ⓤ value is the part of the zone outside the
    // material, so 0 ≤ value ≤ t (the zone touches the true profile). ISO
    // 1101:2017 UZ: any offset of the zone centre, so the zone may lie wholly
    // on one side of the true profile (value below 0 or above t).
    if (standard === 'asme' && !(value >= 0 && value <= tolerance.zone)) {
      return `${row}: the Ⓤ value must lie between 0 and the profile tolerance (ASME Y14.5-2018 §11).`
    }
    if (materialSide !== 'larger' && materialSide !== 'smaller') return `${row}: say whether adding material makes the dimension larger or smaller.`
  }
  if (tolerance.highPoints !== undefined) {
    if (!rule.highPoints) return `${row}: only flatness or straightness of a surface can seat on its high points.`
    if (condition !== 'rfs') return `${row}: "seats on its high points" is for a surface; with ${condition === 'mmc' ? 'Ⓜ' : 'Ⓛ'} the tolerance is on a derived median plane or line.`
    const { materialSide } = tolerance.highPoints
    if (materialSide !== 'larger' && materialSide !== 'smaller') return `${row}: say whether adding material makes the dimension larger or smaller.`
  }
  if (tolerance.projected !== undefined) {
    if (!rule.projected) return `${row}: a projected zone Ⓟ applies to position and orientation tolerances only.`
    if (!(isFiniteNumber(tolerance.projected.height) && tolerance.projected.height > 0)) return `${row}: the projected zone height must be above zero.`
  }
  return null
}

/**
 * "Stack to the feature surface" (stackTo) needs Ⓜ/Ⓛ on a tolerance that
 * locates a feature of size, its size limits and whether it is a hole or a
 * pin: the boundaries of the two lie on opposite sides (geometric.ts,
 * surfaceBoundary).
 */
function stackToError(tolerance: GeometricTolerance, row: string, standard: DrawingStandard): string | null {
  const { stackTo } = tolerance
  if (stackTo === undefined || stackTo === 'axis') return null
  if (stackTo !== 'near-surface' && stackTo !== 'far-surface') return `${row}: stack to the axis, the near surface or the far surface.`
  if (!acceptsSurfaceBoundary(tolerance.characteristic, standard)) {
    return `${row}: only a ${standard === 'iso' ? 'position, coaxiality or symmetry' : 'position'} tolerance with Ⓜ or Ⓛ can be stacked to the feature surface.`
  }
  if ((tolerance.materialCondition ?? 'rfs') === 'rfs') {
    return `${row}: stacking to the feature surface needs Ⓜ or Ⓛ; at RFS add half the size as a separate row instead.`
  }
  if (tolerance.featureType !== 'internal' && tolerance.featureType !== 'external') {
    return `${row}: say whether the feature is a hole or slot (internal) or a pin or tab (external), to stack to its surface.`
  }
  return null
}

/**
 * A datum on a geometric row. MMB/LMB is recorded there; the shift itself is
 * a datum-shift row (datumShiftError), so the size is optional here and
 * checked only when given.
 */
function datumError(datum: DatumReference, rule: (typeof GEOMETRIC_RULES)[keyof typeof GEOMETRIC_RULES], row: string): string | null {
  if (!rule.datums) return `${row}: ${rule.name.toLowerCase()} is a form tolerance and takes no datums.`
  const letter = typeof datum?.letter === 'string' && datum.letter.trim() ? datum.letter.trim() : '?'
  const modifier = datum?.modifier ?? 'rmb'
  if (modifier !== 'rmb' && modifier !== 'mmb' && modifier !== 'lmb') return `${row}: datum ${letter} must be at RMB, MMB or LMB.`
  if (modifier === 'rmb') return null
  if (!rule.datumBoundary) return `${row}: the datums of ${rule.name.toLowerCase()} are always at RMB.`
  return datum.size === undefined ? null : datumSizeError(datum, letter, row)
}

function datumSizeError(datum: DatumReference, letter: string, row: string): string | null {
  const error = sizeError(row, datum.size, `datum feature ${letter}`, 'the datum shift')
  if (error) return error
  if (datum.boundaryAllowance !== undefined && !isNonNegative(datum.boundaryAllowance)) {
    return `${row}: the geometric tolerance of datum feature ${letter} must be zero or more.`
  }
  return null
}

/** A datum-shift row: a frame with at least one datum at MMB or LMB, each with its size limits. */
function datumShiftError(contributor: DatumShiftContributor, row: string): string | null {
  const { datums, frame } = contributor
  if (frame !== undefined && typeof frame !== 'string') return `${row}: the frame name must be text.`
  if (!Array.isArray(datums) || datums.length === 0) return `${row} needs the datums of its frame.`
  for (const datum of datums) {
    const letter = typeof datum?.letter === 'string' && datum.letter.trim() ? datum.letter.trim() : ''
    if (!letter) return `${row}: every datum of the frame needs its letter.`
    const modifier = datum.modifier ?? 'rmb'
    if (modifier !== 'rmb' && modifier !== 'mmb' && modifier !== 'lmb') return `${row}: datum ${letter} must be at RMB, MMB or LMB.`
    if (modifier !== 'rmb') {
      if (datum.size === undefined) return `${row} needs the smallest and largest size of datum feature ${letter}, for the datum shift.`
      const error = datumSizeError(datum, letter, row)
      if (error) return error
    }
  }
  return hasDatumBoundary(datums) ? null : `${row}: no datum of the frame is at MMB or LMB, so the part does not shift; remove this row.`
}

function linkedError(stack: StackResult, row: string): string | null {
  if (!stack || ![stack.nominal, stack.upperDeviation, stack.lowerDeviation, stack.sigma].every(isFiniteNumber)) {
    return `${row}: the linked part stack has no result; open and save that part calculation again.`
  }
  if (stack.upperDeviation < stack.lowerDeviation) return `${row}: the linked part stack has its upper deviation below its lower one.`
  // Omitted in results stored before the parts were kept (the whole band is then arithmetic).
  if (![stack.arithmeticHalfBand, stack.statisticalHalfBand].every((part) => part === undefined || isNonNegative(part))) {
    return `${row}: the linked part stack has a broken worst-case band; open and save that part calculation again.`
  }
  return stack.sigma >= 0 ? null : `${row}: the linked part stack has a negative σ.`
}

function requirementError(requirement: Requirement | undefined): string | null {
  if (!requirement) return null
  const { min, max } = requirement
  if (min !== undefined && !isFiniteNumber(min)) return 'The smallest allowed result must be a number (or left empty).'
  if (max !== undefined && !isFiniteNumber(max)) return 'The largest allowed result must be a number (or left empty).'
  if (min !== undefined && max !== undefined && min > max) return 'The smallest allowed result is above the largest.'
  return null
}

const STANDARD_NAME: Readonly<Record<DrawingStandard, string>> = { iso: 'ISO 1101:2017', asme: 'ASME Y14.5-2018' }

/**
 * Things to check that do not stop the calculation, one sentence each,
 * naming the row. The input is validated first (inputError). See
 * StackAnalysis.warnings.
 */
export function inputWarnings(input: StackInput): readonly string[] {
  const standard = input.standard ?? 'iso'
  const warnings: string[] = []
  const shiftRows = new Map<string, string>()
  const shiftFrames = new Set<string>()
  for (const [index, contributor] of input.contributors.entries()) {
    if (contributor.kind !== 'datum-shift') continue
    const row = rowName(contributor, index)
    const key = datumFrameKey(contributor.datums, contributor.frame)
    const earlier = shiftRows.get(key)
    if (earlier) {
      warnings.push(`${row}: the datum shift of frame ${datumFrameText(contributor.datums)} is already in ${earlier}; count it once per datum reference frame.`)
    } else {
      shiftRows.set(key, row)
    }
    shiftFrames.add(datumFrameText(contributor.datums).toUpperCase())
    // Precedence is the order in the frame: index 2 is the tertiary datum (Fischer 2011; ASME Y14.5-2018 §7).
    const tertiary = contributor.datums[2]
    if (tertiary && tertiary.modifier !== 'rmb') {
      warnings.push(`${row}: the shift of tertiary datum ${tertiary.letter.trim()} is really a rotation about the primary and secondary datums; `
        + 'as a translation it is conservative near that datum feature and may understate far from it.')
    }
  }
  const missingShift = new Set<string>()
  for (const [index, contributor] of input.contributors.entries()) {
    if (contributor.kind !== 'dimension' || contributor.tolerance.kind !== 'geometric') continue
    const tolerance = contributor.tolerance
    const row = rowName(contributor, index)
    const name = GEOMETRIC_RULES[tolerance.characteristic].name.toLowerCase()
    if (!inStandard(tolerance.characteristic, standard)) {
      // ASME Y14.5-2018 removed concentricity and symmetry; the 2009 edition still has them.
      warnings.push(`${row}: ${name} is not in ${STANDARD_NAME[standard]} (removed in 2018; ASME Y14.5-2009 has it). `
        + 'On a new drawing use position, runout or profile instead.')
    }
    if (tolerance.tangentPlane && !acceptsTangentPlane(tolerance.characteristic, standard)) {
      warnings.push(`${row}: Ⓣ (tangent plane) is not used on ${name} under ${STANDARD_NAME[standard]}; `
        + `it applies to planar features under orientation and profile${standard === 'iso' ? ', and location' : ''} tolerances.`)
    }
    if (tolerance.commonZone && !acceptsCombinedZone(tolerance.characteristic, standard)) {
      warnings.push(`${row}: CZ (combined zone) is an ISO 1101:2017 modifier; ASME Y14.5-2018 uses SIM REQT or a continuous feature ⟨CF⟩.`)
    }
    // A line profile locates its section only when related to datums that locate it (ASME Y14.5-2018 §11; ISO 1101:2017).
    if (tolerance.characteristic === 'profile-line' && (tolerance.datums ?? []).length === 0) {
      warnings.push(`${row}: a line profile without datums controls the shape of each section only, not where it is; `
        + 'it belongs in a location chain only when related to datums that locate the section.')
    }
    const frame = datumFrameText(tolerance.datums).toUpperCase()
    if (hasDatumBoundary(tolerance.datums) && !shiftFrames.has(frame) && !missingShift.has(frame)) {
      missingShift.add(frame)
      warnings.push(`${row}: frame ${datumFrameText(tolerance.datums)} has datums at MMB/LMB, and its datum shift is not in this row. `
        + 'If the chain crosses the interface of that datum feature, add one datum-shift row for the frame (not between two features of the same part).')
    }
  }
  return warnings
}
