// The clamped parts from the head down, each with its limiting surface
// pressure pG when entered, and the outer diameter DA of the clamped region
// around the bolt.
import { Button, CloseButton, PanelSection, QuantityField, ValueInputRow } from '../../../../app/ui'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import { withLimitingPressure } from '../logic/designEdits'
import type { JointDesignSpec, PlateSpec } from '../state/boltInputs'
import styles from './design.module.css'
import { MaterialSelect } from './MaterialSelect'
import { PressureField } from './PressureField'

interface PlatesFieldsProps {
  design: JointDesignSpec
  system: UnitSystem
  /** lK from the analysis (plates and washers), when it ran. */
  clampLengthMm: number | null
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function PlatesFields({ design, system, clampLengthMm, onChange }: PlatesFieldsProps) {
  const { plates } = design
  const setPlates = (next: readonly PlateSpec[]) => onChange({ plates: next })
  const replace = (index: number, plate: PlateSpec) => setPlates(plates.map((p, i) => (i === index ? plate : p)))
  const edit = (index: number, changes: Partial<PlateSpec>) => replace(index, { ...plates[index], ...changes })
  const aside = clampLengthMm === null ? undefined : `lK ${formatQuantity('length', system, clampLengthMm)} ${unitOf('length', system)}`
  return (
    <PanelSection label="Clamped parts" aside={aside}>
      {plates.map((plate, i) => (
        <div key={i} className={styles.plate}>
          <MaterialSelect label={`Part ${i + 1} material`} materialId={plate.materialId} onChange={(materialId) => edit(i, { materialId })} />
          <QuantityField
            size="md"
            aria-label={`Part ${i + 1} thickness`}
            quantity="length"
            system={system}
            value={plate.thicknessMm}
            onChange={(thicknessMm) => edit(i, { thicknessMm })}
          />
          {plates.length > 1 ? <CloseButton label={`Remove part ${i + 1}`} onClick={() => setPlates(plates.filter((_, j) => j !== i))} /> : <span />}
          <div className={styles.plateWide}>
            <PressureField
              plate={plate}
              label={`Part ${i + 1}`}
              system={system}
              onChange={(pG) => replace(i, withLimitingPressure(plate, pG))}
            />
          </div>
        </div>
      ))}
      <div>
        <Button variant="link" size="sm" onClick={() => setPlates([...plates, plates[plates.length - 1]])}>
          + Add part
        </Button>
      </div>
      <ValueInputRow
        label="Outer diameter DA"
        quantity="length"
        system={system}
        value={design.outerDiameterMm}
        onChange={(outerDiameterMm) => onChange({ outerDiameterMm })}
      />
    </PanelSection>
  )
}
