// Reading Fit Tolerance inputs that come from outside the screen: a
// calculation stored in the library. Each field is checked on its own; a
// missing or malformed field keeps its default, so a calculation saved by an
// older Datum always opens.
import { materialById } from '../../../../core/materials'
import type { ApplicationFunction, AssemblyMethod, ClearanceRangeUm } from '../../advisor'
import { parseZone, type ZoneKind, type ZoneSpec } from '../../calc'
import { APPLICATION_FUNCTIONS, ASSEMBLY_METHODS } from '../logic/applications'
import { EXAMPLE_FIT_INPUTS, type FitInputs, type FitMode } from './fitInputs'

const MODES: readonly FitMode[] = ['advisor', 'calculator']

export function asMode(value: unknown): FitMode | null {
  return MODES.find((mode) => mode === value) ?? null
}

export function asAssembly(value: unknown): AssemblyMethod | null {
  return ASSEMBLY_METHODS.find((method) => method === value) ?? null
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A tolerance class of the given kind, written 'H7' or as a ZoneSpec. */
export function asZone(value: unknown, kind: ZoneKind): ZoneSpec | null {
  const zone = parseZone(typeof value === 'string' ? value : zoneText(value, kind))
  return zone.ok && zone.value.kind === kind ? zone.value : null
}

/** A stored ZoneSpec written as text ('H7' for a hole, 'g6' for a shaft) for parsing. */
function zoneText(value: unknown, kind: ZoneKind): string {
  if (!isRecord(value) || value.kind !== kind || typeof value.letter !== 'string') return ''
  const letter = kind === 'hole' ? value.letter.toUpperCase() : value.letter
  return `${letter}${String(value.grade)}`
}

/** The functions in the list, in their usual order; null if any is unknown. */
export function asFunctions(value: unknown): readonly ApplicationFunction[] | null {
  if (!Array.isArray(value)) return null
  const functions = APPLICATION_FUNCTIONS.filter((fn) => value.includes(fn))
  return functions.length === value.length ? functions : null
}

/** The id of a material in the Materials Database. */
export function asMaterialId(value: unknown): string | null {
  return typeof value === 'string' && materialById(value).ok ? value : null
}

/**
 * Inputs stored in the library (normally a complete FitInputs; null for the
 * example). A new calculation is stored complete (NEW_FIT_INPUTS), so only
 * the example and older calculations take the example's values.
 */
export function fitInputsFrom(value: unknown): FitInputs {
  const saved = isRecord(value) ? value : {}
  const d = EXAMPLE_FIT_INPUTS
  const temp = isRecord(saved.serviceTempC) ? saved.serviceTempC : {}
  const minC = asNumber(temp.minC)
  const maxC = asNumber(temp.maxC)
  const window = asWindow(saved.requiredClearanceUm)
  return {
    mode: asMode(saved.mode) ?? d.mode,
    nominalMm: asNumber(saved.nominalMm) ?? d.nominalMm,
    hole: asZone(saved.hole, 'hole') ?? d.hole,
    shaft: asZone(saved.shaft, 'shaft') ?? d.shaft,
    functions: asFunctions(saved.functions) ?? d.functions,
    housingMaterialId: asMaterialId(saved.housingMaterialId) ?? d.housingMaterialId,
    shaftMaterialId: asMaterialId(saved.shaftMaterialId) ?? d.shaftMaterialId,
    assembly: asAssembly(saved.assembly) ?? d.assembly,
    serviceTempC: minC !== null && maxC !== null ? { minC, maxC } : d.serviceTempC,
    requiredClearanceUm: window === undefined ? d.requiredClearanceUm : window,
    maxAssemblyInterferenceUm: asNumber(saved.maxAssemblyInterferenceUm) ?? d.maxAssemblyInterferenceUm,
  }
}

/** A stored clearance window; null stays null (no window set), undefined when malformed. */
export function asWindow(value: unknown): ClearanceRangeUm | null | undefined {
  if (value === null) return null
  const window = isRecord(value) ? value : {}
  const minUm = asNumber(window.minUm)
  const maxUm = asNumber(window.maxUm)
  return minUm !== null && maxUm !== null ? { minUm, maxUm } : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
