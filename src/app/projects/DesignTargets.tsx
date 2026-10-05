// Design targets of a project: an editable list (new project drawer and
// project settings) and a read-only list (project sidebar). Temperatures are
// stored in °C and shown in the viewer's unit system.
import { useId, type ReactNode } from 'react'
import type { DesignTargets } from '../../core/projects'
import { formatQuantityRange, unitOf } from '../../core/units'
import { useSettings } from '../settings/settings'
import { InputWell, MonoLabel, NumberInput, ValueRow } from '../ui'
import styles from './DesignTargets.module.css'

type FactorKey = 'minSafetyFactorMetallic' | 'minReserveFactorComposite' | 'minSlipSafety'

const FACTORS: readonly { key: FactorKey; label: ReactNode; short: ReactNode; name: string }[] = [
  { key: 'minSafetyFactorMetallic', label: 'Min safety factor, metallic', short: 'Min SF metallic', name: 'Minimum safety factor, metallic' },
  { key: 'minReserveFactorComposite', label: 'Min reserve factor, composite', short: 'Min RF composite', name: 'Minimum reserve factor, composite' },
  {
    key: 'minSlipSafety',
    label: <>Slip safety S<sub>G</sub></>,
    short: <>Slip safety S<sub>G</sub></>,
    name: 'Minimum slip safety',
  },
]

interface EditorProps {
  targets: DesignTargets
  onChange: (targets: DesignTargets) => void
}

export function DesignTargetsEditor({ targets, onChange }: EditorProps) {
  const { unitSystem } = useSettings()
  const headingId = useId()
  const temperature = (key: 'serviceTempMinC' | 'serviceTempMaxC', label: string) => (
    <NumberInput
      label={label}
      quantity="temperature"
      system={unitSystem}
      value={targets[key]}
      onChange={(value) => onChange({ ...targets, [key]: value })}
    />
  )
  return (
    <section className={styles.box} aria-labelledby={headingId}>
      <div className={styles.head}>
        <MonoLabel as="h3" id={headingId}>
          Design targets
        </MonoLabel>
        <span className={styles.hint}>Pre-filled in every tool</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Service temperature</span>
        <InputWell unit={unitOf('temperature', unitSystem)}>
          {temperature('serviceTempMinC', 'Lowest service temperature')} …{' '}
          {temperature('serviceTempMaxC', 'Highest service temperature')}
        </InputWell>
      </div>
      {FACTORS.map(({ key, label, name }) => (
        <div key={key} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <InputWell>
            <NumberInput label={name} value={targets[key]} onChange={(value) => onChange({ ...targets, [key]: value })} />
          </InputWell>
        </div>
      ))}
    </section>
  )
}

export function DesignTargetsList({ targets }: { targets: DesignTargets }) {
  const { unitSystem } = useSettings()
  return (
    <>
      <ValueRow
        size="sm"
        label="Service temp."
        value={formatQuantityRange('temperature', unitSystem, targets.serviceTempMinC, targets.serviceTempMaxC)}
      />
      {FACTORS.map(({ key, short }) => (
        <ValueRow key={key} size="sm" label={short} value={targets[key].toFixed(2)} />
      ))}
    </>
  )
}
