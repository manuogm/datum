// Warnings about the materials themselves, whatever the fit: a housing or
// shaft used above its indicative service limit (Material.maxServiceTempC).
// The advisor gives the same notes with its advice; this gives them in both
// modes, with or without a required window, so the calculator shows them too.
import type { Material } from '../../../../core/materials'
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import type { TemperatureRangeC } from '../../advisor'

export function materialNotes(
  housing: Material, shaft: Material, serviceTempC: TemperatureRangeC, system: UnitSystem,
): readonly string[] {
  const temperature = (c: number) => formatQuantity('temperature', system, c, { withUnit: true })
  const parts = housing.id === shaft.id ? [housing] : [housing, shaft]
  return parts
    .filter((m) => serviceTempC.maxC > m.maxServiceTempC)
    .map((m) => `${m.name} is advised for sustained service up to about ${temperature(m.maxServiceTempC)};`
      + ` the service range reaches ${temperature(serviceTempC.maxC)}.`)
}
