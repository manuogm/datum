// The nominal diameter: Ø field with the ISO size range it falls in, and a
// log-scale slider for coarse changes.
import { QuantityField, Slider } from '../../../../app/ui'
import { formatDecimal, formatQuantity, toDisplay, type UnitSystem } from '../../../../core/units'
import { nominalSizeRange } from '../../calc'
import { SLIDER_STEPS, SLIDER_TICKS, sliderPosition, sliderSizeMm, tickPercent } from '../logic/sizeSlider'
import styles from './shared.module.css'

interface NominalSizeProps {
  nominalMm: number
  system: UnitSystem
  onChange: (nominalMm: number) => void
}

export function NominalSize({ nominalMm, system, onChange }: NominalSizeProps) {
  const range = nominalSizeRange(nominalMm)
  const length = (mm: number) => formatDecimal(toDisplay('length', system, mm), system === 'si' ? 0 : 3)
  const ticks = SLIDER_TICKS[system].map((value, i, all) => ({
    label: i === all.length - 1 ? `${value} ${system === 'si' ? 'mm' : 'in'}` : String(value),
    percent: tickPercent(value, system),
  }))
  return (
    <div className={styles.nominal}>
      <div className={styles.nominalHead}>
        <span>Nominal diameter</span>
        {range.ok && <span className={styles.hint}>range {length(range.value.overMm)}–{length(range.value.upToMm)}</span>}
      </div>
      <QuantityField
        prefix="Ø"
        aria-label="Nominal diameter"
        quantity="length"
        system={system}
        value={nominalMm}
        onChange={onChange}
      />
      <Slider
        name="Nominal diameter, coarse"
        value={sliderPosition(nominalMm)}
        min={0}
        max={SLIDER_STEPS}
        valueText={formatQuantity('length', system, nominalMm, { withUnit: true })}
        onChange={(position) => onChange(sliderSizeMm(position, system))}
        ticks={ticks}
      />
    </div>
  )
}
