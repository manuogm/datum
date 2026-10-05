// The temperatures for thermal assembly, as the design's check rows show
// them: "Heat housing for assembly ≥ 74 °C", and cooling the shaft instead
// when that is practical (not colder than liquid nitrogen).
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import { COLDEST_SHAFT_COOLING_TEMP_C, type ThermalAssembly } from '../../advisor'

export interface AssemblyTemperature {
  readonly label: string
  /** e.g. '≥ 73.8 °C' */
  readonly value: string
}

/** No rows when the fit goes together without heating or cooling (thermalAssembly is null). */
export function assemblyTemperatures(thermal: ThermalAssembly | null, system: UnitSystem): readonly AssemblyTemperature[] {
  if (thermal === null) return []
  const temperature = (tempC: number) => formatQuantity('temperature', system, tempC, { withUnit: true })
  const { housingHeatTempC: heatC, shaftCoolTempC: coolC } = thermal
  const rows: AssemblyTemperature[] = []
  if (heatC !== null) rows.push({ label: 'Heat housing for assembly', value: `≥ ${temperature(heatC)}` })
  if (coolC !== null && coolC >= COLDEST_SHAFT_COOLING_TEMP_C) {
    rows.push({ label: heatC === null ? 'Cool shaft for assembly' : 'or cool shaft to', value: `≤ ${temperature(coolC)}` })
  }
  return rows
}
