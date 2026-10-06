// Dialog: a modal window over a dimmed page ("New folder", "Move to …").
// Traps focus, closes on Escape, the × or a click on the
// backdrop, and is announced to screen readers by its title.
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Dialog.module.css'
import { CloseButton } from './CloseButton'
import { cx } from './cx'
import { useFocusTrap } from './useFocusTrap'

interface DialogProps {
  title: string
  /** Mono line under the title, e.g. "IN EXAMPLES". */
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Buttons at the bottom right (Cancel, Save). */
  footer?: ReactNode
  /** Quiet text at the bottom left. */
  footerNote?: ReactNode
  /** md 520px (forms); lg 760px (a row of cards to choose from). */
  size?: 'md' | 'lg'
}

export function Dialog({ title, subtitle, onClose, children, footer, footerNote, size = 'md' }: DialogProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  useFocusTrap(panel, onClose)
  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div ref={panel} className={cx(styles.dialog, size === 'lg' && styles.large)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={styles.head}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </div>
          <CloseButton onClick={onClose} label="Close dialog" />
        </div>
        <div className={styles.body}>{children}</div>
        {footer && (
          <div className={styles.footer}>
            {footerNote && <span className={styles.note}>{footerNote}</span>}
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
