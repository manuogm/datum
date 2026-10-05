// Keeps keyboard focus inside a dialog or drawer while it is open: focuses
// the element marked data-autofocus (or the first control) on open, wraps Tab
// at the ends, closes on Escape and gives focus back to where it was.
// Keys are handled at the document, after React: a control inside that uses
// Escape itself (e.g. to cancel an inline edit) calls event.stopPropagation().
import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(container: RefObject<HTMLElement | null>, onEscape: () => void): void {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    const root = container.current
    if (!root) return
    const previous = document.activeElement as HTMLElement | null
    const focusables = () => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const initial = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? root
    initial.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (!root.contains(event.target as Node)) return
      if (event.key === 'Escape') {
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [container])
}
