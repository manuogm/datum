// Select: native dropdown styled as a Direction B input, with optional
// leading content (a swatch, a "Housing" caption) and trailing meta (α 23.4).
import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import box from './inputBox.module.css'
import styles from './Select.module.css'
import { cx } from './cx'
import { Icon } from './Icon'
import { MonoLabel } from './MonoLabel'

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'value' | 'onChange'> {
  options: readonly SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  leading?: ReactNode
  meta?: ReactNode
  /** lg 42px, md 40px, sm 34px (border included). */
  size?: 'lg' | 'md' | 'sm'
  className?: string
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  leading,
  meta,
  size = 'lg',
  className,
  id,
  ...selectProps
}: SelectProps<T>) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const control = (
    <div className={cx(box.box, styles.select, box[size], !label && className)}>
      {leading}
      <select
        id={selectId}
        className={cx(box.control, styles.control)}
        value={value}
        onChange={(event) => onChange(options[event.target.selectedIndex].value)}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {meta && <span className={styles.meta}>{meta}</span>}
      <Icon name="chevron-down" className={styles.chevron} />
    </div>
  )
  if (!label) return control
  return (
    <div className={cx(box.stack, className)}>
      <MonoLabel as="label" htmlFor={selectId}>
        {label}
      </MonoLabel>
      {control}
    </div>
  )
}
