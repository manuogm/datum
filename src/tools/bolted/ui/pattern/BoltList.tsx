// The bolts of the pattern: position in the plan and joint type, one row
// each, with add and remove.
import { Button, CloseButton, InputWell, NumberInput, PanelSection, Select } from '../../../../app/ui'
import { unitOf, type UnitSystem } from '../../../../core/units'
import type { PatternBoltSpec, PatternSpec } from '../state/boltInputs'
import styles from './pattern.module.css'

interface BoltListProps {
  pattern: PatternSpec
  system: UnitSystem
  onChange: (id: string, changes: Partial<Omit<PatternBoltSpec, 'id'>>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function BoltList({ pattern, system, onChange, onAdd, onRemove }: BoltListProps) {
  const types = pattern.jointTypes.map((j) => ({ value: j.id, label: j.id }))
  return (
    <PanelSection label="Bolts" aside={`x, y in the plan, ${unitOf('length', system)}`}>
      {pattern.bolts.map((bolt) => (
        <div key={bolt.id} className={styles.boltRow}>
          <span className={styles.boltId}>{bolt.id}</span>
          <InputWell>
            <NumberInput label={`${bolt.id} x`} quantity="length" system={system} value={bolt.xMm} onChange={(xMm) => onChange(bolt.id, { xMm })} />
          </InputWell>
          <InputWell>
            <NumberInput label={`${bolt.id} y`} quantity="length" system={system} value={bolt.yMm} onChange={(yMm) => onChange(bolt.id, { yMm })} />
          </InputWell>
          <Select size="sm" aria-label={`${bolt.id} joint type`} options={types} value={bolt.jointTypeId} onChange={(jointTypeId) => onChange(bolt.id, { jointTypeId })} />
          {pattern.bolts.length > 1 ? <CloseButton label={`Remove ${bolt.id}`} onClick={() => onRemove(bolt.id)} /> : <span />}
        </div>
      ))}
      <div>
        <Button variant="link" size="sm" onClick={onAdd}>
          + Add bolt
        </Button>
      </div>
    </PanelSection>
  )
}
