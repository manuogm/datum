// The bolt: ISO thread (diameter and pitch), property class and head type.
// Washers go with the clamped parts (PlatesFields).
import { PanelSection, SegmentedControl, Select } from '../../../../app/ui'
import { NOMINAL_DIAMETERS_MM, pitchesForMm, PROPERTY_CLASSES, type HeadType } from '../../calc'
import { threadOfNominal } from '../logic/designEdits'
import { HEAD_LABELS } from '../logic/labels'
import type { JointDesignSpec } from '../state/boltInputs'
import styles from './design.module.css'

const DIAMETERS = NOMINAL_DIAMETERS_MM.map((d) => ({ value: String(d), label: `M${d}` }))
const CLASSES = PROPERTY_CLASSES.map((c) => ({ value: c, label: c }))
const HEADS = (Object.keys(HEAD_LABELS) as HeadType[]).map((h) => ({ value: h, label: HEAD_LABELS[h] }))

interface BoltFieldsProps {
  design: JointDesignSpec
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function BoltFields({ design, onChange }: BoltFieldsProps) {
  const { nominalMm, pitchMm } = design.thread
  const pitches = pitchesForMm(nominalMm).map((p, i) => ({ value: String(p), label: `${p}${i === 0 ? ' coarse' : ''}` }))
  return (
    <PanelSection label="Bolt">
      <div className={styles.pair}>
        <Select
          size="md"
          aria-label="Nominal diameter"
          options={DIAMETERS}
          value={String(nominalMm)}
          onChange={(d) => onChange({ thread: threadOfNominal(Number(d)) })}
          meta="d"
        />
        <Select
          size="md"
          aria-label="Pitch"
          options={pitches}
          value={String(pitchMm)}
          onChange={(p) => onChange({ thread: { nominalMm, pitchMm: Number(p) } })}
          meta="P"
        />
      </div>
      <div className={styles.pair}>
        <Select
          size="md"
          aria-label="Property class"
          options={CLASSES}
          value={design.propertyClass}
          onChange={(propertyClass) => onChange({ propertyClass })}
        />
        <SegmentedControl label="Head" options={HEADS} value={design.headType} onChange={(headType) => onChange({ headType })} size="sm" fill />
      </div>
    </PanelSection>
  )
}
