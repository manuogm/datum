// Drawer: a form panel docked on the right of a page ("New project"). The
// page keeps its content beside it (mark that content inert while the drawer
// is open); on narrow screens the drawer covers the page instead. Traps
// focus and closes on Escape or the ×.
import { useId, useRef, type ReactNode } from 'react'
import styles from './Drawer.module.css'
import { CloseButton } from './CloseButton'
import { useFocusTrap } from './useFocusTrap'

interface DrawerProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Actions at the bottom, right-aligned (Cancel, Create). */
  footer?: ReactNode
  /** Wrap the drawer in a form; the footer's submit button then submits it. */
  onSubmit?: () => void
}

export function Drawer({ title, onClose, children, footer, onSubmit }: DrawerProps) {
  const titleId = useId()
  const panel = useRef<HTMLFormElement>(null)
  useFocusTrap(panel, onClose)
  return (
    <form
      ref={panel}
      className={styles.drawer}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
    >
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <CloseButton onClick={onClose} label="Close panel" />
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </form>
  )
}
