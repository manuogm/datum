// The filters of the Materials Database page: text, family, minimum service
// temperature, density window, minimum yield strength and kind of source.
import { MATERIAL_FAMILIES, SOURCES, type Material, type MaterialFamily, type SourceKind } from '../../core/materials'

export interface MaterialFilter {
  query: string
  families: ReadonlySet<MaterialFamily>
  minServiceTempC: number
  densityGPerCm3: readonly [number, number]
  /** Materials without a yield strength (composites) only pass at 0. */
  minYieldMPa: number
  sourceKinds: ReadonlySet<SourceKind>
}

/** The source kinds offered as filters, in display order (screening judgement is never a material's main source). */
export const SOURCE_FILTERS: readonly { kind: SourceKind; label: string }[] = [
  { kind: 'standard', label: 'Standards (EN, ISO, AMS, ASTM)' },
  { kind: 'handbook', label: 'Handbooks (ASM)' },
  { kind: 'datasheet', label: 'Producer datasheets' },
]

export const SLIDER_RANGES = {
  serviceTempC: { min: 0, max: 700, step: 10 },
  densityGPerCm3: { min: 1, max: 9, step: 0.1 },
  yieldMPa: { min: 0, max: 1600, step: 50 },
} as const

export function defaultFilter(minServiceTempC = 0): MaterialFilter {
  return {
    query: '',
    families: new Set(Object.keys(MATERIAL_FAMILIES) as MaterialFamily[]),
    minServiceTempC,
    densityGPerCm3: [SLIDER_RANGES.densityGPerCm3.min, SLIDER_RANGES.densityGPerCm3.max],
    minYieldMPa: 0,
    sourceKinds: new Set(SOURCE_FILTERS.map((s) => s.kind)),
  }
}

/** The kind of a material's main source (where most of its values come from). */
export function mainSourceKind(material: Material): SourceKind {
  return SOURCES[material.sources.default].kind
}

function matchesQuery(material: Material, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const fields = [material.name, material.spec, material.condition, material.designation ?? '']
  return fields.some((field) => field.toLowerCase().includes(needle))
}

export function matchesFilter(material: Material, filter: MaterialFilter): boolean {
  const [minDensity, maxDensity] = filter.densityGPerCm3
  const yieldOk = filter.minYieldMPa <= 0 || (material.yieldStrengthMPa ?? 0) >= filter.minYieldMPa
  return (
    matchesQuery(material, filter.query) &&
    filter.families.has(material.family) &&
    material.maxServiceTempC >= filter.minServiceTempC &&
    material.densityGPerCm3 >= minDensity &&
    material.densityGPerCm3 <= maxDensity &&
    yieldOk &&
    filter.sourceKinds.has(mainSourceKind(material))
  )
}
