// Tightening and contact: the method (with its tightening factor αA), the
// lowest expected friction coefficients and the number of interfaces that
// carry shear by friction, the surface roughness behind embedding, and where
// the axial load enters the clamped parts.
import { InputWell, NumberInput, PanelSection, Select, ValueRow } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import {
  LOAD_INTRODUCTION_FACTOR, TIGHTENING_METHODS, type LoadIntroductionPosition, type SurfaceRoughness, type TighteningMethod,
} from '../../calc'
import { LOAD_INTRODUCTION_LABELS, ROUGHNESS_LABELS, TIGHTENING_LABELS } from '../logic/labels'
import type { JointDesignSpec } from '../state/boltInputs'
import styles from './design.module.css'

const optionsOf = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
const METHODS = optionsOf<TighteningMethod>(TIGHTENING_LABELS)
const ROUGHNESS = optionsOf<SurfaceRoughness>(ROUGHNESS_LABELS)
const POSITIONS = optionsOf<LoadIntroductionPosition>(LOAD_INTRODUCTION_LABELS)

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
      <Select
        size="md"
        aria-label="Surface roughness"
        options={ROUGHNESS}
        value={design.surfaceRoughness}
        onChange={(surfaceRoughness) => onChange({ surfaceRoughness })}
        meta="embedding"
      />
      <Select
        size="md"
        aria-label="Load introduction"
        options={POSITIONS}
        value={design.loadIntroduction}
        onChange={(loadIntroduction) => onChange({ loadIntroduction })}
        meta={`n ${formatDecimal(LOAD_INTRODUCTION_FACTOR[design.loadIntroduction], 1, true)}`}
      />
    </PanelSection>
  )
}
