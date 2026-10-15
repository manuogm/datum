// A length that may be left empty: a requirement limit ("none"), a new row's
// nominal, a feature size not entered yet. Shown in the viewer's length unit
// and stored in mm; emptying it stores null. Like the kit's quantity inputs
// it keeps what is typed until it is a complete number.
import { useState, type ComponentProps, type ReactNode } from 'react'
import { Field, cx } from '../../../../app/ui'
import { formatQuantity, fromDisplay, parseDecimal, unitOf, type UnitSystem } from '../../../../core/units'
import styles from './editor.module.css'

type FieldProps = Omit<ComponentProps<typeof Field>, 'value' | 'onChange' | 'unit' | 'type' | 'prefix' | 'size'>

interface LengthInputProps extends FieldProps {
  value: number | null
  onChange: (value: number | null) => void
  system: UnitSystem
  /** Show "+" on positive values (deviations). */
  signed?: boolean
  showUnit?: boolean
  prefix?: ReactNode
  size?: 'lg' | 'md' | 'sm'
  /** Outlined in --bad: the engine names this field. */
  invalid?: boolean
}

export function LengthInput({ value, onChange, system, signed = false, showUnit = false, invalid = false, size = 'sm', className, onBlur, ...fieldProps }: LengthInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = value === null ? '' : formatQuantity('length', system, value, { signed })
  return (
    <Field
      mono
      size={size}
      inputMode="decimal"
      autoComplete="off"
      {...fieldProps}
      className={cx(styles.length, invalid && styles.invalid, className)}
      unit={showUnit ? unitOf('length', system) : undefined}
      value={draft ?? shown}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        if (text.trim() === '') onChange(null)
        else {
          const typed = parseDecimal(text)
          if (typed !== null) onChange(fromDisplay('length', system, typed))
        }
      }}
      onBlur={(event) => {
        setDraft(null)
        onBlur?.(event)
      }}
    />
  )
}
