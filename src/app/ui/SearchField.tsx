// SearchField: search input with the magnifier icon and an optional keyboard
// shortcut hint (⌘K), used on Home, Projects and Materials.
import type { InputHTMLAttributes } from 'react'
import box from './inputBox.module.css'
import styles from './SearchField.module.css'
import { cx } from './cx'
import { Icon } from './Icon'

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Accessible name; the placeholder is only a hint. */
  label: string
  shortcut?: string
  /** lg 42px, md 40px, sm 34px (border included). */
  size?: 'lg' | 'md' | 'sm'
  className?: string
}

export function SearchField({ label, shortcut, size = 'lg', className, ...inputProps }: SearchFieldProps) {
  return (
    <div className={cx(box.box, styles.search, box[size], className)} role="search">
      <Icon name="search" className={styles.icon} />
      <input type="search" aria-label={label} className={box.control} {...inputProps} />
      {shortcut && (
        <kbd className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </kbd>
      )}
    </div>
  )
}
