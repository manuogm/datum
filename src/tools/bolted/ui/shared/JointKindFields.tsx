// What the bolt screws into: a nut (through-bolt), a tapped part, or a
// thread insert in the part. A key-locking insert's outer thread is a
// catalogue value: the field asks for it and is never filled in by guess.
import { useState } from 'react'
import { Field, PanelSection, QuantityField, SegmentedControl } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { InsertType, JointType } from '../../calc'
import { jointOfKind, parseThread, threadDesignation } from '../logic/designEdits'
import { INSERT_LABELS, JOINT_KIND_LABELS } from '../logic/labels'
import type { JointDesignSpec, JointKindSpec } from '../state/boltInputs'
import styles from './design.module.css'
import { MaterialSelect } from './MaterialSelect'

const KINDS = (Object.keys(JOINT_KIND_LABELS) as JointType['kind'][]).map((k) => ({ value: k, label: JOINT_KIND_LABELS[k] }))
const INSERTS = (Object.keys(INSERT_LABELS) as InsertType[]).map((i) => ({ value: i, label: INSERT_LABELS[i] }))

interface JointKindFieldsProps {
  design: JointDesignSpec
  system: UnitSystem
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function JointKindFields({ design, system, onChange }: JointKindFieldsProps) {
  const { joint } = design
  const change = (next: JointKindSpec) => onChange({ joint: next })
  return (
    <PanelSection label="Joint">
      <SegmentedControl label="Joint type" options={KINDS} value={joint.kind} onChange={(kind) => change(jointOfKind(design, kind))} fill />
      {joint.kind === 'through-bolt' && <span className={styles.note}>ISO 4032 nut of the bolt&apos;s property class.</span>}
      {joint.kind !== 'through-bolt' && (
        <>
          {joint.kind === 'insert' && (
            <SegmentedControl
              label="Insert type"
              options={INSERTS}
              value={joint.insert}
              onChange={(insert) => change({ ...joint, insert })}
              size="sm"
              fill
            />
          )}
          <MaterialSelect label="Tapped part material" materialId={joint.materialId} onChange={(materialId) => change({ ...joint, materialId })} />
          <QuantityField
            size="md"
            prefix={joint.kind === 'insert' ? 'Insert length' : 'Engagement'}
            aria-label={joint.kind === 'insert' ? 'Insert length' : 'Thread engagement'}
            quantity="length"
            system={system}
            value={joint.engagementMm}
            onChange={(engagementMm) => change({ ...joint, engagementMm })}
          />
          {joint.kind === 'insert' && (
            <OuterThreadField
              outerThread={joint.outerThread}
              required={joint.insert === 'key-locking'}
              onChange={(outerThread) => change({ ...joint, outerThread })}
            />
          )}
        </>
      )}
    </PanelSection>
  )
}

interface OuterThreadFieldProps {
  outerThread: Extract<JointKindSpec, { kind: 'insert' }>['outerThread']
  /** A key-locking insert cannot be checked without it. */
  required: boolean
  onChange: (outerThread: OuterThreadFieldProps['outerThread']) => void
}

/** The thread the insert makes in the part, typed as 'M6×1'; cleared to use the STI thread of a Helicoil. */
function OuterThreadField({ outerThread, required, onChange }: OuterThreadFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = outerThread ? threadDesignation(outerThread) : ''
  const missing = required && outerThread === null
  return (
    <div className={styles.rows}>
      <Field
        size="md"
        mono
        prefix="Outer thread"
        aria-label="Insert outer thread"
        placeholder="e.g. M6×1"
        tone={missing ? 'warn' : 'default'}
        value={draft ?? shown}
        onChange={(event) => {
          setDraft(event.target.value)
          const thread = parseThread(event.target.value)
          if (thread || event.target.value.trim() === '') onChange(thread)
        }}
        onBlur={() => setDraft(null)}
      />
      <span className={missing ? styles.warnNote : styles.note}>
        {required
          ? 'From the insert catalogue: the thread the Keensert cuts in the part.'
          : 'From the insert catalogue; leave empty for the STI thread of the Helicoil.'}
      </span>
    </div>
  )
}
