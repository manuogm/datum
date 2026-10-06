// NameDialog: asks for one name: a new folder's, or a new name for a folder
// or calculation. Shows the store's reason when the name is refused.
import { useState } from 'react'
import type { Result } from '../../core/result'
import { Button, Dialog, Field } from '../ui'
import styles from './dialogs.module.css'

interface NameDialogProps {
  title: string
  subtitle?: string
  label: string
  initialName: string
  submitLabel: string
  /** Applies the name; an error keeps the dialog open and shows it. */
  onSubmit: (name: string) => Result<unknown>
  onClose: () => void
}

export function NameDialog({ title, subtitle, label, initialName, submitLabel, onSubmit, onClose }: NameDialogProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const formId = `${title.replace(/\s+/g, '-').toLowerCase()}-form`
  const submit = () => {
    const result = onSubmit(name)
    if (result.ok) onClose()
    else setError(result.error)
  }
  return (
    <Dialog
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" form={formId}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Field
          label={label}
          size="md"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          onFocus={(event) => event.target.select()}
          data-autofocus
        />
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </Dialog>
  )
}
