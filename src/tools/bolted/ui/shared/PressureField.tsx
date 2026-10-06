// The limiting surface pressure pG of a clamped part, entered by hand. A
// metal falls back to the table or its Rm when it is left empty; a polymer or
// composite creeps, so R10 cannot be checked until pG is entered.
import { useState } from 'react'
import { Field } from '../../../../app/ui'
import { formatQuantity, fromDisplay, parseDecimal, unitOf, type UnitSystem } from '../../../../core/units'
import { materialName } from '../logic/labels'
import { needsLimitingPressure } from '../logic/designEdits'
import type { PlateSpec } from '../state/boltInputs'
import styles from './design.module.css'

interface PressureFieldProps {
  plate: PlateSpec
  /** Names the part, e.g. "Part 2". */
  label: string
  system: UnitSystem
  /** The pG in MPa, or undefined when the field is cleared. */
  onChange: (limitingPressureMPa: number | undefined) => void
}

export function PressureField({ plate, label, system, onChange }: PressureFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const required = needsLimitingPressure(plate.materialId)
  const value = plate.limitingPressureMPa
  const missing = required && value === undefined
  return (
    <div className={styles.rows}>
      <Field
        size="md"
        prefix="pG"
        unit={unitOf('strength', system)}
        aria-label={`${label} limiting surface pressure pG`}
        placeholder={required ? 'required' : 'from table'}
        inputMode="decimal"
        tone={missing ? 'warn' : 'default'}
        value={draft ?? (value === undefined ? '' : formatQuantity('strength', system, value))}
        onChange={(event) => {
          setDraft(event.target.value)
          const typed = parseDecimal(event.target.value)
          if (typed !== null) onChange(fromDisplay('strength', system, typed))
          else if (event.target.value.trim() === '') onChange(undefined)
        }}
        onBlur={() => setDraft(null)}
      />
      {required && (
        <span className={missing ? styles.warnNote : styles.note}>
          {label}, {materialName(plate.materialId)}, creeps under the head: pG from the supplier or a test.
        </span>
      )}
    </div>
  )
}
