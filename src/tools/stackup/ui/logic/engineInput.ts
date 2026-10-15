// The engine's input (calc/StackInput) from what the engineer entered. A
// value not entered yet goes in as NaN, so the engine names the row and
// what it needs ("Row 3 needs a nominal value."). Inputs the screen does not
// show for a row (a modifier the characteristic cannot take, a modifier that
// is switched off) are left out, so the result only rests on what is shown.
import {
  GEOMETRIC_RULES, acceptsDiameterZone, isProfile,
  type Contributor, type ContributorTolerance, type DatumReference, type DrawingStandard, type GeometricTolerance, type Requirement,
  type StackInput, type StackResult,
} from '../../calc'
import type { DimensionRow, GeometricEntry, StackInputs, ToleranceEntry } from '../state/stackInputs'
import { unequalEngineValue } from './unequal'

/** A number, or NaN when it is not entered yet (the engine then says what is missing). */
const entered = (value: number | null): number => value ?? Number.NaN

/** "Shoulder to circlip groove" → "shoulder to circlip groove", but "OD to face" stays. */
function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text
}

/** The result's name: Part "<part>: <result>" (as an assembly lists it), Assembly "<result>"; "Result" when empty. */
export function stackName(inputs: Pick<StackInputs, 'mode' | 'partName' | 'resultName'>): string {
  const result = inputs.resultName.trim() || 'Result'
  const part = inputs.partName.trim()
  return inputs.mode === 'part' && part ? `${part}: ${lowerFirst(result)}` : result
}

/** The label a row goes by: its own, or "Dimension 3" when left empty. */
export function rowLabel(row: Pick<DimensionRow, 'label'>, index: number): string {
  return row.label.trim() || `Dimension ${index + 1}`
}

/** The requirement with only the limits that are set. */
export function requirementOf(inputs: Pick<StackInputs, 'requirement'>): Requirement {
  const { min, max } = inputs.requirement
  return { ...(min === null ? {} : { min }), ...(max === null ? {} : { max }) }
}

/**
 * Whether the material-condition input is shown for this characteristic:
 * where the standard allows Ⓜ/Ⓛ, and also where only the other standard
 * does but one is set, so the engine can say why it is not allowed.
 */
export function showsMaterialCondition(entry: Pick<GeometricEntry, 'characteristic' | 'materialCondition'>, standard: DrawingStandard): boolean {
  const allowed = GEOMETRIC_RULES[entry.characteristic].materialCondition
  return allowed[standard] || (entry.materialCondition !== 'rfs' && (allowed.iso || allowed.asme))
}

function geometricTolerance(entry: GeometricEntry, standard: DrawingStandard): GeometricTolerance {
  const rule = GEOMETRIC_RULES[entry.characteristic]
  const material = showsMaterialCondition(entry, standard) && entry.materialCondition !== 'rfs'
  const datums: DatumReference[] = rule.datums
    ? entry.datums.filter((d) => d.letter.trim()).map((d) => {
        const modifier = rule.datumBoundary ? d.modifier : 'rmb'
        if (modifier === 'rmb') return { letter: d.letter.trim(), modifier }
        return {
          letter: d.letter.trim(),
          modifier,
          size: { min: entered(d.feature.min), max: entered(d.feature.max) },
          featureType: d.feature.type,
          ...(d.boundaryAllowance === null ? {} : { boundaryAllowance: d.boundaryAllowance }),
        }
      })
    : []
  return {
    kind: 'geometric',
    characteristic: entry.characteristic,
    zone: entered(entry.zone),
    ...(entry.diameterZone && acceptsDiameterZone(entry.characteristic) ? { diameterZone: true } : {}),
    ...(material
      ? {
          materialCondition: entry.materialCondition,
          featureSize: { min: entered(entry.feature.min), max: entered(entry.feature.max) },
          featureType: entry.feature.type,
        }
      : {}),
    ...(datums.length > 0 ? { datums } : {}),
    // Ⓤ / UZ as typed becomes the engine's Ⓤ value here, with the zone as it is now (unequal.ts).
    ...(entry.unequal.on && isProfile(entry.characteristic)
      ? { unequal: { value: entered(unequalEngineValue(entry)), materialSide: entry.unequal.materialSide } }
      : {}),
    ...(entry.projected.on && rule.projected ? { projected: { height: entered(entry.projected.height) } } : {}),
    ...(entry.freeState ? { freeState: true } : {}),
    ...(entry.tangentPlane ? { tangentPlane: true } : {}),
    ...(entry.commonZone ? { commonZone: true } : {}),
  }
}

/** A row's tolerance as the engine takes it. */
export function engineTolerance(tolerance: ToleranceEntry, standard: DrawingStandard): ContributorTolerance {
  switch (tolerance.kind) {
    case 'symmetric':
      return { kind: 'symmetric', plusMinus: entered(tolerance.plusMinus) }
    case 'deviations':
      return { kind: 'deviations', upper: entered(tolerance.upper), lower: entered(tolerance.lower) }
    case 'limits':
      return { kind: 'limits', min: entered(tolerance.min), max: entered(tolerance.max) }
    case 'geometric':
      return geometricTolerance(tolerance, standard)
  }
}

/** A linked part stack as the assembly uses it: the values (saved or last known) and the part's name. */
export interface LinkValues {
  readonly label: string
  readonly stack: StackResult
}

/**
 * The engine's input. `links` gives, for each linked row (by row id), the
 * part stack values to use; see links.ts for which values those are.
 */
export function engineInput(inputs: StackInputs, links: ReadonlyMap<string, LinkValues>): StackInput {
  // One contributor per row, in order, so the engine's "Row 3" is the third row on screen.
  const contributors = inputs.rows.map((row, index): Contributor => {
    if (row.kind === 'linked') {
      const link = links.get(row.id) ?? { label: row.last.partName || row.last.calculationName, stack: row.last.stack }
      return { kind: 'linked', label: link.label, sensitivity: row.sensitivity, stack: link.stack }
    }
    return {
      kind: 'dimension',
      label: rowLabel(row, index),
      sensitivity: row.sensitivity,
      nominal: entered(row.nominal),
      tolerance: engineTolerance(row.tolerance, inputs.standard),
      ...(row.statistical ? { statistical: true } : {}),
    }
  })
  return {
    name: stackName(inputs),
    contributors,
    requirement: requirementOf(inputs),
    method: inputs.method,
    standard: inputs.standard,
  }
}
