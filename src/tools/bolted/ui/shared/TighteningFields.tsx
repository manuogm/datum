// Tightening (advanced inputs of the bolt): the method with its tightening
// factor αA and the lowest expected thread and head friction. The friction
// against slip (µT, qF) sits with the transverse load (SlipFields), and the
// washers with the clamped parts (PlatesFields).
import { InputWell, NumberInput, PanelSection, Select, ValueRow } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { TIGHTENING_METHODS, type TighteningMethod } from '../../calc'
import { optionsOf, TIGHTENING_LABELS } from '../logic/labels'
import type { JointDesignSpec } from '../state/boltInputs'
import styles from './design.module.css'

const METHODS = optionsOf<TighteningMethod>(TIGHTENING_LABELS)

type FrictionKey = 'threadFriction' | 'headFriction'

const FRICTIONS: readonly { key: FrictionKey; label: string }[] = [
  { key: 'threadFriction', label: 'Thread friction µG' },
  { key: 'headFriction', label: 'Head friction µK' },
]

interface TighteningFieldsProps {
  design: JointDesignSpec
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function TighteningFields({ design, onChange }: TighteningFieldsProps) {
  return (
    <PanelSection label="Tightening">
      <Select
        size="md"
        aria-label="Tightening method"
        options={METHODS}
        value={design.tightening}
        onChange={(tightening) => onChange({ tightening })}
        meta={`αA ${formatDecimal(TIGHTENING_METHODS[design.tightening].factor, 1, true)}`}
      />
      <div className={styles.rows}>
        {FRICTIONS.map(({ key, label }) => (
          <ValueRow
            key={key}
            label={label}
            value={
              <InputWell>
                <NumberInput label={label} value={design[key]} onChange={(value) => onChange({ [key]: value })} />
              </InputWell>
            }
          />
        ))}
      </div>
    </PanelSection>
  )
}
