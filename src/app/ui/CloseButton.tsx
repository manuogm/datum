// CloseButton: the × in the corner of dialogs and drawers.
import styles from './CloseButton.module.css'
import { Icon } from './Icon'

interface CloseButtonProps {
  onClick: () => void
  /** Accessible name, e.g. "Close dialog". */
  label?: string
}

export function CloseButton({ onClick, label = 'Close' }: CloseButtonProps) {
  return (
    <button type="button" className={styles.close} onClick={onClick} aria-label={label}>
      <Icon name="close" />
    </button>
  )
}
