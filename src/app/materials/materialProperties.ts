// The properties shown for a material, each with its value in the viewer's
// units and the reference it comes from (and, for a composite ply, its
// lamina data), plus the snapshot saved when a material is chosen for a
// project part.
import { sourceOf, type LaminaProperties, type Material, type MaterialProperty, type MaterialSource } from '../../core/materials'
import type { SnapshotFigure, ToolSnapshot } from '../../core/projects'
import { formatDecimal, formatQuantity, unitOf, type Quantity, type UnitSystem } from '../../core/units'

interface PropertyDefinition {
  key: MaterialProperty | 'maxServiceTempC'
  label: string
  quantity?: Quantity
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

/** The ply data the Composite Laminate tool uses, in the order of a ply datasheet. */
const LAMINA_PROPERTIES: readonly { label: string; quantity?: Quantity; value: (l: LaminaProperties) => number }[] = [
  { label: 'Modulus E1', quantity: 'modulus', value: (l) => l.e1GPa },
  { label: 'Modulus E2', quantity: 'modulus', value: (l) => l.e2GPa },
  { label: 'Shear modulus G12', quantity: 'modulus', value: (l) => l.g12GPa },
  { label: "Poisson's ν12", value: (l) => l.nu12 },
  { label: 'Tension Xt', quantity: 'strength', value: (l) => l.xtMPa },
  { label: 'Compression Xc', quantity: 'strength', value: (l) => l.xcMPa },
  { label: 'Tension Yt', quantity: 'strength', value: (l) => l.ytMPa },
  { label: 'Compression Yc', quantity: 'strength', value: (l) => l.ycMPa },
  { label: 'Shear S', quantity: 'strength', value: (l) => l.sMPa },
  { label: 'Ply thickness t', quantity: 'length', value: (l) => l.plyThicknessMm },
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
  /** A composite ply's lamina data; null for other materials. */
  lamina: { form: LaminaProperties['form']; rows: PropertyRow[] } | null
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
  /** The number of the property's source, listing the source on first use. */
  const sourceNumber = (key: MaterialProperty | 'maxServiceTempC', label: string) => {
    const source = sourceOf(material, key)
    let entry = sources.find((s) => s.source === source)
    if (!entry) {
      entry = { number: sources.length + 1, source, properties: [] }
      sources.push(entry)
    }
    entry.properties.push(label)
    return entry.number
  }
  const rows = PROPERTIES.map((property) => {
    const number = sourceNumber(property.key, property.label)
    const raw = property.value(material)
    const label = property.key === 'fatigue' && material.fatigue ? `${property.label} ${cyclesText(material.fatigue.cycles)}` : property.label
    const value =
      raw === null ? '—' : property.quantity ? formatQuantity(property.quantity, system, raw) : (property.format ?? String)(raw)
    const unit = property.quantity ? unitOf(property.quantity, system) : (property.unit ?? '')
    return { label, value, unit, sourceNumber: number }
  })
  return { rows, lamina: material.lamina ? laminaDetails(material.lamina, sourceNumber('lamina', 'Ply data'), system) : null, sources }
}

function laminaDetails(lamina: LaminaProperties, sourceNumber: number, system: UnitSystem): NonNullable<MaterialDetails['lamina']> {
  const rows = LAMINA_PROPERTIES.map(({ label, quantity, value }) => ({
    label,
    value: quantity ? formatQuantity(quantity, system, value(lamina)) : formatDecimal(value(lamina), 3),
    unit: quantity ? unitOf(quantity, system) : '',
    sourceNumber,
  }))
  return { form: lamina.form, rows }
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
