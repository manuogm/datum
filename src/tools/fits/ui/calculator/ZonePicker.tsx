// Picks a tolerance class for the hole or the shaft: fundamental deviation
// letter (position of the zone) and tolerance grade (its width).
import { Marker, Select } from '../../../../app/ui'
import { DEVIATION_LETTERS, TOLERANCE_GRADES, type ZoneSpec } from '../../calc'
import styles from './calculator.module.css'

const GRADE_OPTIONS = TOLERANCE_GRADES.map((grade) => ({ value: grade, label: grade }))

interface ZonePickerProps {
  zone: ZoneSpec
  onChange: (zone: ZoneSpec) => void
}

export function ZonePicker({ zone, onChange }: ZonePickerProps) {
  const isHole = zone.kind === 'hole'
  const name = isHole ? 'Hole' : 'Shaft'
  const letters = DEVIATION_LETTERS.map((letter) => ({ value: letter, label: isHole ? letter.toUpperCase() : letter }))
  return (
    <div className={styles.zone}>
      <span className={styles.zoneLabel}>
        <Marker shape="square" color={isHole ? 'hole' : 'accent'} />
        {name}
      </span>
      <div className={styles.zoneSelects}>
        <Select
          size="md"
          className={styles.zoneSelect}
          aria-label={`${name} fundamental deviation`}
          options={letters}
          value={zone.letter}
          onChange={(letter) => onChange({ ...zone, letter })}
        />
        <Select
          size="md"
          className={styles.zoneSelect}
          aria-label={`${name} tolerance grade`}
          options={GRADE_OPTIONS}
          value={zone.grade}
          onChange={(grade) => onChange({ ...zone, grade })}
        />
      </div>
    </div>
  )
}
