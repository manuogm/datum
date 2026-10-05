// The properties shown for a material, each with its value in the viewer's
// units and the reference it comes from, plus the snapshot saved when a
// material is chosen for a project part.
import { sourceOf, type Material, type MaterialProperty, type MaterialSource } from '../../core/materials'
import type { SnapshotFigure, ToolSnapshot } from '../../core/projects'
import { formatDecimal, type UnitSystem } from '../../core/units'
import { formatMaterialValue, materialUnit, type MaterialQuantity } from './materialUnits'

interface PropertyDefinition {
  key: MaterialProperty | 'maxServiceTempC'
  label: string
  quantity?: MaterialQuantity
  /** Fixed unit for unit-less or percentage values. */
  unit?: string
  value: (m: Material) => number | null
  /** How a value without a display quantity is written. */
  format?: (value: number) => string
}

const PROPERTIES: readonly PropertyDefinition[] = [
  { key: 'densityGPerCm3', label: 'Density ρ', quantity: 'density', value: (m) => m.densityGPerCm3 },
  { key: 'youngsModulusGPa', label: "Young's modulus E", quantity: 'modulus', value: (m) => m.youngsModulusGPa },
  { key: 'yieldStrengthMPa', label: 'Yield Rp0.2', quantity: 'strength', value: (m) => m.yieldStrengthMPa },
  { key: 'tensileStrengthMPa', label: 'Tensile Rm', quantity: 'strength', value: (m) => m.tensileStrengthMPa },
  { key: 'elongationPercent', label: 'Elongation A', unit: '%', value: (m) => m.elongationPercent, format: String },
  { key: 'poissonsRatio', label: "Poisson's ν", value: (m) => m.poissonsRatio, format: (v) => formatDecimal(v, 3) },
  { key: 'thermalExpansionUmPerMK', label: 'Expansion α', quantity: 'expansion', value: (m) => m.thermalExpansionUmPerMK },
  { key: 'thermalConductivityWPerMK', label: 'Conductivity λ', quantity: 'conductivity', value: (m) => m.thermalConductivityWPerMK },
  { key: 'fatigue', label: 'Fatigue σ_f', quantity: 'strength', value: (m) => m.fatigue?.strengthMPa ?? null },
  { key: 'maxServiceTempC', label: 'Max service', quantity: 'temperature', value: (m) => m.maxServiceTempC },
]

export interface PropertyRow {
  label: string
  /** "—" when the property is not given. */
  value: string
  unit: string
  /** Number of the reference in the material's source list (1-based). */
  sourceNumber: number
}

export interface MaterialDetails {
  rows: PropertyRow[]
  /** References in order of first use, with the properties each one gives. */
  sources: { number: number; source: MaterialSource; properties: string[] }[]
}

/** "10⁷" for 1e7 cycles, as written next to a fatigue strength. */
export function cyclesText(cycles: number): string {
  const exponent = Math.floor(Math.log10(cycles) + 1e-9)
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const mantissa = cycles / 10 ** exponent
  const power = `10${[...String(exponent)].map((d) => superscripts[Number(d)]).join('')}`
  return Math.abs(mantissa - 1) < 1e-9 ? power : `${formatDecimal(mantissa, 1)}·${power}`
}

export function materialDetails(material: Material, system: UnitSystem): MaterialDetails {
  const sources: MaterialDetails['sources'] = []
  const rows = PROPERTIES.map((property) => {
    const source = sourceOf(material, property.key)
    let entry = sources.find((s) => s.source === source)
    if (!entry) {
      entry = { number: sources.length + 1, source, properties: [] }
      sources.push(entry)
    }
    entry.properties.push(property.label)
    const raw = property.value(material)
    const label = property.key === 'fatigue' && material.fatigue ? `${property.label} ${cyclesText(material.fatigue.cycles)}` : property.label
    const value =
      raw === null ? '—' : property.quantity ? formatMaterialValue(property.quantity, system, raw) : (property.format ?? String)(raw)
    const unit = property.quantity ? materialUnit(property.quantity, system) : (property.unit ?? '')
    return { label, value, unit, sourceNumber: entry.number }
  })
  return { rows, sources }
}

/** What the Materials page saves as a revision when a material is chosen for a part (values in SI). */
export function materialSnapshot(material: Material): ToolSnapshot<{ materialId: string }> {
  const figures: SnapshotFigure[] = [
    { label: 'Material', value: material.name },
    ...(material.yieldStrengthMPa === null ? [] : [{ label: 'Rp0.2', value: String(material.yieldStrengthMPa), unit: 'MPa' }]),
    { label: 'α', value: String(material.thermalExpansionUmPerMK), unit: 'µm/(m·K)' },
  ]
  return {
    tool: 'mat',
    title: material.name,
    status: 'pass',
    figures,
    inputs: { materialId: material.id },
    materialIds: [material.id],
  }
}
