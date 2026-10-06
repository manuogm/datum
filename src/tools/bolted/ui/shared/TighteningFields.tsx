// Tightening (advanced inputs of the bolt): washers, the method with its
// tightening factor αA, the lowest expected friction coefficients and the
// number of interfaces that carry shear by friction.
import { InputWell, NumberInput, PanelSection, Select, Switch, ValueRow } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { TIGHTENING_METHODS, type TighteningMethod } from '../../calc'
import { optionsOf, TIGHTENING_LABELS } from '../logic/labels'
import type { JointDesignSpec } from '../state/boltInputs'
import styles from './design.module.css'

const METHODS = optionsOf<TighteningMethod>(TIGHTENING_LABELS)

type FrictionKey = 'threadFriction' | 'headFriction' | 'interfaceFriction'

const FRICTIONS: readonly { key: FrictionKey; label: string }[] = [
  { key: 'threadFriction', label: 'Thread friction µG' },
  { key: 'headFriction', label: 'Head friction µK' },
  { key: 'interfaceFriction', label: 'Interface friction µT' },
]

interface TighteningFieldsProps {
  design: JointDesignSpec
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function TighteningFields({ design, onChange }: TighteningFieldsProps) {
  return (
    <PanelSection label="Tightening">
      <Switch checked={design.washers} onChange={(washers) => onChange({ washers })}>
        ISO 7089 washers
      </Switch>
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
        <ValueRow
          label="Slip interfaces qF"
          value={
            <InputWell>
              <NumberInput
                label="Slip interfaces qF"
                decimals={0}
                value={design.frictionInterfaces}
                onChange={(value) => onChange({ frictionInterfaces: Math.max(1, Math.round(value)) })}
              />
            </InputWell>
          }
        />
      </div>
    </PanelSection>
  )
}
