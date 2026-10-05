// Display units for material properties. Values are stored in SI; Imperial
// shows lb/in³, Msi, ksi, BTU/(h·ft·°F), °F and µin/(in·°F). Temperature and
// α come from core/units; the other conversions live here until core/units
// covers them.
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../core/units'

export type MaterialQuantity = 'density' | 'modulus' | 'strength' | 'conductivity' | 'temperature' | 'expansion'

interface Conversion {
  unit: string
  decimals: number
  factor: number
}

const LB_PER_IN3_PER_G_PER_CM3 = 0.0361273
const KSI_PER_MPA = 0.1450377 // also Msi per GPa
const BTU_PER_H_FT_F_PER_W_PER_M_K = 0.5778

const CONVERSIONS: Record<'density' | 'modulus' | 'strength' | 'conductivity', Record<UnitSystem, Conversion>> = {
  density: {
    si: { unit: 'g/cm³', decimals: 2, factor: 1 },
    imperial: { unit: 'lb/in³', decimals: 3, factor: LB_PER_IN3_PER_G_PER_CM3 },
  },
  modulus: {
    si: { unit: 'GPa', decimals: 1, factor: 1 },
    imperial: { unit: 'Msi', decimals: 1, factor: KSI_PER_MPA },
  },
  strength: {
    si: { unit: 'MPa', decimals: 0, factor: 1 },
    imperial: { unit: 'ksi', decimals: 1, factor: KSI_PER_MPA },
  },
  conductivity: {
    si: { unit: 'W/(m·K)', decimals: 1, factor: 1 },
    imperial: { unit: 'BTU/(h·ft·°F)', decimals: 1, factor: BTU_PER_H_FT_F_PER_W_PER_M_K },
  },
}

export function materialUnit(quantity: MaterialQuantity, system: UnitSystem): string {
  if (quantity === 'temperature' || quantity === 'expansion') return unitOf(quantity, system)
  return CONVERSIONS[quantity][system].unit
}

/** A stored SI value written in the viewer's units, without the unit symbol. */
export function formatMaterialValue(quantity: MaterialQuantity, system: UnitSystem, siValue: number): string {
  if (quantity === 'temperature') return formatQuantity('temperature', system, siValue)
  if (quantity === 'expansion') return formatQuantity('expansion', system, siValue)
  const { decimals, factor } = CONVERSIONS[quantity][system]
  return formatDecimal(siValue * factor, decimals, true)
}
