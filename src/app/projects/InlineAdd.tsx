// InlineAdd: a dashed "+ Add …" chip that turns into a small text box.
// Enter adds the text, Escape or an empty blur cancels.
import { useState } from 'react'
import { Chip } from '../ui'
import styles from './InlineAdd.module.css'

interface InlineAddProps {
  /** Chip text, e.g. "+ Add part". */
  label: string
  /** Accessible name of the text box, e.g. "New part name". */
  inputLabel: string
  onAdd: (text: string) => void
}

export function InlineAdd({ label, inputLabel, onAdd }: InlineAddProps) {
  const [text, setText] = useState<string | null>(null)
  if (text === null) {
    return (
      <Chip variant="add" onClick={() => setText('')}>
        {label}
      </Chip>
    )
  }
  const commit = () => {
    if (text.trim()) onAdd(text.trim())
    setText(null)
  }
  return (
    <input
      className={styles.input}
      aria-label={inputLabel}
      autoFocus
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          event.stopPropagation()
          setText(null)
        }
      }}
    />
  )
}
