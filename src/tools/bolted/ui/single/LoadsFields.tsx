// Working loads on the single joint, the friction that holds the transverse
// load (passed in as `slip`, as it belongs to the design) and the service
// temperature range.
import type { ReactNode } from 'react'
import { PanelSection, RangeInputRow, SegmentedControl, ValueInputRow } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { LoadVariation, TemperatureRangeC } from '../../calc'
import type { JointLoadSpec } from '../state/boltInputs'
import styles from '../shared/design.module.css'

const VARIATIONS: readonly { value: LoadVariation; label: string }[] = [
  { value: 'static', label: 'Static FQ' },
  { value: 'alternating', label: 'Alternating FQ' },
]

interface LoadsFieldsProps {
  loads: JointLoadSpec
  serviceTempC: TemperatureRangeC
  system: UnitSystem
  onLoadsChange: (changes: Partial<JointLoadSpec>) => void
  onTemperatureChange: (serviceTempC: TemperatureRangeC) => void
  /** µT and qF, under the transverse load they hold. */
  slip?: ReactNode
}

export function LoadsFields({ loads, serviceTempC, system, onLoadsChange, onTemperatureChange, slip }: LoadsFieldsProps) {
  return (
    <PanelSection label="Loads per bolt">
      <div className={styles.rows}>
        <ValueInputRow label="Axial FA,max" quantity="force" system={system} value={loads.axialMaxN} onChange={(axialMaxN) => onLoadsChange({ axialMaxN })} />
        <ValueInputRow label="Axial FA,min" quantity="force" system={system} value={loads.axialMinN} onChange={(axialMinN) => onLoadsChange({ axialMinN })} />
        <ValueInputRow label="Transverse FQ" quantity="force" system={system} value={loads.transverseN} onChange={(transverseN) => onLoadsChange({ transverseN })} />
      </div>
      <SegmentedControl
        label="Transverse load"
        options={VARIATIONS}
        value={loads.transverseVariation}
        onChange={(transverseVariation) => onLoadsChange({ transverseVariation })}
        size="sm"
        fill
      />
      {slip}
      <RangeInputRow
        label="Service temp."
        quantity="temperature"
        system={system}
        min={serviceTempC.minC}
        max={serviceTempC.maxC}
        onChange={(minC, maxC) => onTemperatureChange({ minC, maxC })}
      />
    </PanelSection>
  )
}
