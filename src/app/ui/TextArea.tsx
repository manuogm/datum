// TextArea: multi-line text in the Direction B input box (revision notes,
// decision rationale), with a MonoLabel above.
import { useId, type TextareaHTMLAttributes } from 'react'
import box from './inputBox.module.css'
import styles from './TextArea.module.css'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextArea({ label, id, className, rows = 3, ...props }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className={cx(box.stack, className)}>
      <MonoLabel as="label" htmlFor={inputId}>
        {label}
      </MonoLabel>
      <div className={cx(box.box, styles.area)}>
        <textarea id={inputId} className={cx(box.control, styles.control)} rows={rows} {...props} />
      </div>
    </div>
  )
}
