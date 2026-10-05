// Field: text or number input in the Direction B input box, with an optional
// mono prefix (Ø), unit suffix (mm, °C) and a MonoLabel above.
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import box from './inputBox.module.css'
import styles from './Field.module.css'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string
  prefix?: ReactNode
  unit?: ReactNode
  /** Mono numerals for numeric values (default true when a unit is shown). */
  mono?: boolean
  /** lg 42px, md 40px, sm 34px (border included). */
  size?: 'lg' | 'md' | 'sm'
  tone?: 'default' | 'warn'
  className?: string
}

export function Field({
  label,
  prefix,
  unit,
  mono = unit !== undefined,
  size = 'lg',
  tone = 'default',
  className,
  id,
  ...inputProps
}: FieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const control = (
    <div className={cx(box.box, box[size], tone === 'warn' && box.warn, mono && styles.mono, !label && className)}>
      {prefix && <span className={cx(styles.affix, styles.prefix)}>{prefix}</span>}
      <input id={inputId} className={box.control} {...inputProps} />
      {unit && <span className={cx(styles.affix, styles.unit)}>{unit}</span>}
    </div>
  )
  if (!label) return control
  return (
    <div className={cx(box.stack, className)}>
      <MonoLabel as="label" htmlFor={inputId}>
        {label}
      </MonoLabel>
      {control}
    </div>
  )
}
