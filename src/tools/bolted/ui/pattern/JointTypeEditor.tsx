// The joint type being edited, beside the list on the Joint types step (its
// id and name head that column): copy and remove (a joint type that bolts
// still use cannot be removed), then its design inputs, the advanced ones
// under More options.
import { Button, PanelSection } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import { DesignInputs } from '../shared/DesignInputs'
import type { JointDesignSpec, PatternJointTypeSpec } from '../state/boltInputs'
import styles from './pattern.module.css'

interface JointTypeEditorProps {
  jointType: PatternJointTypeSpec
  inUse: boolean
  system: UnitSystem
  onChange: (changes: Partial<JointDesignSpec>) => void
  onCopy: () => void
  onRemove: () => void
}

export function JointTypeEditor({ jointType, inUse, system, onChange, onCopy, onRemove }: JointTypeEditorProps) {
  return (
    <>
      <PanelSection>
        <div className={styles.actions}>
          <Button size="sm" onClick={onCopy}>
            Copy as new type
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={inUse} title={inUse ? 'Bolts use this joint type' : undefined}>
            Remove
          </Button>
        </div>
      </PanelSection>
      <DesignInputs design={jointType.design} system={system} onChange={onChange} />
    </>
  )
}
