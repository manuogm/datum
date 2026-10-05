// Dialog: a modal window over a dimmed page ("Save revision to project",
// "Record decision"). Traps focus, closes on Escape, the × or a click on the
// backdrop, and is announced to screen readers by its title.
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Dialog.module.css'
import { CloseButton } from './CloseButton'
import { useFocusTrap } from './useFocusTrap'

interface DialogProps {
  title: string
  /** Mono line under the title, e.g. "FIT TOLERANCE · FT-0412". */
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Buttons at the bottom right (Cancel, Save). */
  footer?: ReactNode
  /** Quiet text at the bottom left, e.g. "Rev B stays in history". */
  footerNote?: ReactNode
}

export function Dialog({ title, subtitle, onClose, children, footer, footerNote }: DialogProps) {
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
      <div ref={panel} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
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
