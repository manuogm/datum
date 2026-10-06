// What holds the transverse load FQ by friction (R12): the lowest expected
// friction µT between the clamped parts and the number of interfaces qF that
// carry it. The rows sit beside FQ on the single joint's Loads step; a joint
// type of a pattern has them as a section under its More options.
import { InputWell, NumberInput, PanelSection, ValueRow } from '../../../../app/ui'
import type { JointDesignSpec } from '../state/boltInputs'
import styles from './design.module.css'

interface SlipFieldsProps {
  design: JointDesignSpec
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function SlipFields(props: SlipFieldsProps) {
  return (
    <PanelSection label="Friction against slip">
      <SlipRows {...props} />
    </PanelSection>
  )
}

export function SlipRows({ design, onChange }: SlipFieldsProps) {
  return (
    <div className={styles.rows}>
      <ValueRow
        label="Interface friction µT"
        value={
          <InputWell>
            <NumberInput label="Interface friction µT" value={design.interfaceFriction} onChange={(interfaceFriction) => onChange({ interfaceFriction })} />
          </InputWell>
        }
      />
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
  )
}
