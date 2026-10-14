import { GEOMETRIC_RULES, acceptsMaterialCondition, isProfile } from './geometric'
import { MAX_CONTRIBUTORS } from './rules'
import type { Contributor, DatumReference, DrawingStandard, GeometricTolerance, PlainTolerance, Requirement, SizeLimits, StackInput, StackResult } from './types'

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
  if (contributor?.kind !== 'dimension' && contributor?.kind !== 'linked') return `${row} must be a dimension or a linked part stack.`
  // In 1D the coefficient is ±1 (or e.g. 0.5 for a radius from a diameter); 0 would drop the row.
  if (!(isFiniteNumber(contributor.sensitivity) && contributor.sensitivity !== 0)) return `${row} needs a direction (+1 or −1).`
  if (contributor.kind === 'linked') return linkedError(contributor.stack, row)
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
  for (const datum of tolerance.datums ?? []) {
    const error = datumError(datum, rule, row)
    if (error) return error
  }
  if (tolerance.unequal !== undefined) {
    if (!isProfile(tolerance.characteristic)) return `${row}: only a profile tolerance can be unequally disposed (Ⓤ / UZ).`
    const { value, materialSide } = tolerance.unequal
    if (!(isFiniteNumber(value) && value >= 0 && value <= tolerance.zone)) {
      return `${row}: the unequally disposed share must lie between 0 and the profile tolerance.`
    }
    if (materialSide !== 'larger' && materialSide !== 'smaller') return `${row}: say whether adding material makes the dimension larger or smaller.`
  }
  if (tolerance.projected !== undefined) {
    if (!rule.projected) return `${row}: a projected zone Ⓟ applies to position and orientation tolerances only.`
    if (!(isFiniteNumber(tolerance.projected.height) && tolerance.projected.height > 0)) return `${row}: the projected zone height must be above zero.`
  }
  return null
}

function datumError(datum: DatumReference, rule: (typeof GEOMETRIC_RULES)[keyof typeof GEOMETRIC_RULES], row: string): string | null {
  if (!rule.datums) return `${row}: ${rule.name.toLowerCase()} is a form tolerance and takes no datums.`
  const letter = typeof datum?.letter === 'string' && datum.letter.trim() ? datum.letter.trim() : '?'
  const modifier = datum?.modifier ?? 'rmb'
  if (modifier !== 'rmb' && modifier !== 'mmb' && modifier !== 'lmb') return `${row}: datum ${letter} must be at RMB, MMB or LMB.`
  if (modifier === 'rmb') return null
  if (!rule.datumBoundary) return `${row}: the datums of ${rule.name.toLowerCase()} are always at RMB.`
  const error = sizeError(row, datum.size, `datum feature ${letter}`, 'the datum shift')
  if (error) return error
  if (datum.boundaryAllowance !== undefined && !isNonNegative(datum.boundaryAllowance)) {
    return `${row}: the geometric tolerance of datum feature ${letter} must be zero or more.`
  }
  return null
}

function linkedError(stack: StackResult, row: string): string | null {
  if (!stack || ![stack.nominal, stack.upperDeviation, stack.lowerDeviation, stack.sigma].every(isFiniteNumber)) {
    return `${row}: the linked part stack has no result; open and save that part calculation again.`
  }
  if (stack.upperDeviation < stack.lowerDeviation) return `${row}: the linked part stack has its upper deviation below its lower one.`
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
