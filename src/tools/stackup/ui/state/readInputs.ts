// Reading Tolerance Stack-up inputs that come from outside the screen: a
// calculation stored in the library. A malformed field keeps its default,
// so a calculation saved by an older Datum always opens; a row that cannot
// be read at all (no kind, no tolerance type) is left out. null is the
// seeded Part example.
import { GEOMETRIC_CHARACTERISTICS, type GeometricCharacteristic, type StackResult } from '../../calc'
import {
  EXAMPLE_STACK_INPUTS, NEW_STACK_INPUTS, emptyDatum, newDatumShift, newGeometric,
  type DatumCell, type DatumShiftRow, type DimensionRow, type FeatureSize, type GeometricEntry, type LinkSnapshot, type LinkedRow, type StackInputs,
  type StackRow, type ToleranceEntry,
} from './stackInputs'

type Fields = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value)
const fields = (value: unknown): Fields => (isRecord(value) ? value : {})
const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const asText = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)
const asFlag = (value: unknown): boolean => value === true
const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T => options.find((o) => o === value) ?? fallback
/** A non-zero coefficient (±1 in 1D); anything else adds. */
const asSensitivity = (value: unknown): number => {
  const number = asNumber(value)
  return number !== null && number !== 0 ? number : 1
}

function asFeature(value: unknown): FeatureSize {
  const feature = fields(value)
  return { type: oneOf(['internal', 'external'], feature.type, 'internal'), min: asNumber(feature.min), max: asNumber(feature.max) }
}

function asDatum(value: unknown): DatumCell {
  const datum = fields(value)
  return {
    letter: asText(datum.letter).slice(0, 2),
    modifier: oneOf(['rmb', 'mmb', 'lmb'], datum.modifier, 'rmb'),
    feature: asFeature(datum.feature),
    boundaryAllowance: asNumber(datum.boundaryAllowance),
  }
}

function asGeometric(tolerance: Fields): GeometricEntry {
  const characteristic = oneOf<GeometricCharacteristic>(GEOMETRIC_CHARACTERISTICS, tolerance.characteristic, 'position')
  const base = newGeometric(characteristic)
  const unequal = fields(tolerance.unequal)
  const projected = fields(tolerance.projected)
  const highPoints = fields(tolerance.highPoints)
  return {
    ...base,
    zone: asNumber(tolerance.zone),
    diameterZone: asFlag(tolerance.diameterZone),
    materialCondition: oneOf(['rfs', 'mmc', 'lmc'], tolerance.materialCondition, 'rfs'),
    feature: asFeature(tolerance.feature),
    datums: asDatums(tolerance.datums),
    unequal: {
      on: asFlag(unequal.on),
      value: asNumber(unequal.value),
      // Saved before typedAs was stored, the number was always the ASME Ⓤ value (an ISO offset v was saved as zone/2 + v).
      typedAs: oneOf(['iso-offset', 'asme-value'], unequal.typedAs, 'asme-value'),
      materialSide: oneOf(['larger', 'smaller'], unequal.materialSide, 'larger'),
    },
    projected: { on: asFlag(projected.on), height: asNumber(projected.height) },
    freeState: asFlag(tolerance.freeState),
    tangentPlane: asFlag(tolerance.tangentPlane),
    commonZone: asFlag(tolerance.commonZone),
    // Stored before these existed: to the axis, centred (what the engine did then).
    stackTo: oneOf(['axis', 'near-surface', 'far-surface'], tolerance.stackTo, 'axis'),
    highPoints: { on: asFlag(highPoints.on), materialSide: oneOf(['larger', 'smaller'], highPoints.materialSide, 'larger') },
  }
}

/** Three datum cells from a stored list (missing cells empty). */
function asDatums(value: unknown): DatumCell[] {
  const datums = Array.isArray(value) ? value.slice(0, 3).map(asDatum) : []
  return [...datums, emptyDatum(), emptyDatum(), emptyDatum()].slice(0, 3)
}

function asTolerance(value: unknown): ToleranceEntry | null {
  const tolerance = fields(value)
  switch (tolerance.kind) {
    case 'symmetric':
      return { kind: 'symmetric', plusMinus: asNumber(tolerance.plusMinus) }
    case 'deviations':
      return { kind: 'deviations', upper: asNumber(tolerance.upper), lower: asNumber(tolerance.lower) }
    case 'limits':
      return { kind: 'limits', min: asNumber(tolerance.min), max: asNumber(tolerance.max) }
    case 'geometric':
      return asGeometric(tolerance)
    default:
      return null
  }
}

function asStackResult(value: unknown, fallbackName: string): StackResult | null {
  const stack = fields(value)
  const [nominal, mean, upperDeviation, lowerDeviation, sigma] = [stack.nominal, stack.mean, stack.upperDeviation, stack.lowerDeviation, stack.sigma].map(asNumber)
  if (nominal === null || upperDeviation === null || lowerDeviation === null || sigma === null) return null
  // The two parts of the WC band (kept since the engine carries ⟨ST⟩ through links); absent in older results, read as all arithmetic.
  const [arithmeticHalfBand, statisticalHalfBand] = [stack.arithmeticHalfBand, stack.statisticalHalfBand].map(asNumber)
  return {
    name: asText(stack.name, fallbackName), nominal, mean: mean ?? nominal + (upperDeviation + lowerDeviation) / 2, upperDeviation, lowerDeviation, sigma,
    ...(arithmeticHalfBand === null ? {} : { arithmeticHalfBand }),
    ...(statisticalHalfBand === null ? {} : { statisticalHalfBand }),
  }
}

function asSnapshot(value: unknown): LinkSnapshot | null {
  const last = fields(value)
  const stack = asStackResult(last.stack, asText(last.calculationName))
  if (!stack) return null
  return {
    stack,
    partName: asText(last.partName),
    resultName: asText(last.resultName),
    calculationName: asText(last.calculationName),
    folderName: asText(last.folderName),
    updatedAt: asText(last.updatedAt),
  }
}

function asRow(value: unknown, id: string): StackRow | null {
  const row = fields(value)
  if (row.kind === 'linked') {
    const last = asSnapshot(row.last)
    const calcId = asText(row.calcId)
    if (!last || !calcId) return null
    const linked: LinkedRow = { kind: 'linked', id, sensitivity: asSensitivity(row.sensitivity), calcId, last }
    return linked
  }
  if (row.kind === 'datum-shift') {
    const shift: DatumShiftRow = {
      ...newDatumShift(id, asDatums(row.datums)),
      label: asText(row.label), sensitivity: asSensitivity(row.sensitivity), frame: asText(row.frame), source: asText(row.source),
    }
    return shift
  }
  if (row.kind !== 'dimension') return null
  const tolerance = asTolerance(row.tolerance)
  if (!tolerance) return null
  const dimension: DimensionRow = {
    kind: 'dimension', id, label: asText(row.label), sensitivity: asSensitivity(row.sensitivity),
    nominal: asNumber(row.nominal), tolerance, statistical: asFlag(row.statistical), source: asText(row.source),
  }
  return dimension
}

/** The rows that can be read, each with an id of its own (a missing or repeated id gets a new one). */
function asRows(value: unknown): StackRow[] {
  if (!Array.isArray(value)) return []
  const taken = new Set<string>()
  const rows: StackRow[] = []
  for (const [index, item] of value.entries()) {
    const wanted = asText(fields(item).id)
    let id = wanted && !taken.has(wanted) ? wanted : `r${index + 1}`
    for (let n = index + 1; taken.has(id); n++) id = `r${n}x`
    const row = asRow(item, id)
    if (!row) continue
    taken.add(id)
    rows.push(row)
  }
  return rows
}

export function stackInputsFrom(value: unknown): StackInputs {
  if (value === null || value === undefined) return EXAMPLE_STACK_INPUTS
  const saved = fields(value)
  const d = NEW_STACK_INPUTS
  const requirement = fields(saved.requirement)
  const mode = oneOf(['part', 'assembly'], saved.mode, d.mode)
  const rows = asRows(saved.rows)
  return {
    mode,
    partName: asText(saved.partName),
    resultName: asText(saved.resultName),
    requirement: { min: asNumber(requirement.min), max: asNumber(requirement.max) },
    method: oneOf(['worst-case', 'rss'], saved.method, d.method),
    standard: oneOf(['iso', 'asme'], saved.standard, d.standard),
    startLabel: asText(saved.startLabel),
    endLabel: asText(saved.endLabel),
    // Only an assembly links part stacks.
    rows: mode === 'part' ? rows.filter((row) => row.kind !== 'linked') : rows,
  }
}
