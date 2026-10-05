// Legend for the temperature bands: one entry per band shown ("20 °C",
// "140 °C"), each with the band's own swatch.
import { cx, LegendItem } from '../../../../app/ui'
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import type { TemperatureBand } from '../logic/serviceClearance'
import bandStyles from './bands.module.css'

interface BandLegendProps {
  bands: readonly Pick<TemperatureBand, 'kind' | 'tempC'>[]
  system: UnitSystem
}

export function BandLegend({ bands, system }: BandLegendProps) {
  return (
    <>
      {bands.map((band) => (
        <LegendItem key={band.kind} swatch={<span className={cx(bandStyles.swatch, bandStyles.strip, bandStyles[band.kind])} />}>
          {formatQuantity('temperature', system, band.tempC, { withUnit: true })}
        </LegendItem>
      ))}
    </>
  )
}
