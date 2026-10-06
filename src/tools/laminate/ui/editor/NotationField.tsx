// The stacking notation of the laminate ([0/±45/90]s), typed in full. A
// complete notation replaces the ply angles at once; while it is incomplete
// the field keeps what was typed and says what the reader expected.
import { useState } from 'react'
import { Field } from '../../../../app/ui'
import { formatLayup, parseLayup } from '../../calc'
import styles from './editor.module.css'

interface NotationFieldProps {
  anglesDeg: readonly number[]
  onChange: (anglesDeg: readonly number[]) => void
}

export function NotationField({ anglesDeg, onChange }: NotationFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft === null ? null : parseLayup(draft)
  const error = parsed && !parsed.ok ? parsed.error : null
  return (
    <div className={styles.notation}>
      <Field
        size="md"
        mono
        prefix="Layup"
        aria-label="Stacking sequence"
        placeholder="[0/±45/90]s"
        tone={error ? 'warn' : 'default'}
        value={draft ?? formatLayup(anglesDeg)}
        onChange={(event) => {
          setDraft(event.target.value)
          const layup = parseLayup(event.target.value)
          if (layup.ok) onChange(layup.value)
        }}
        onBlur={() => setDraft(null)}
      />
      <span className={error ? styles.warnNote : styles.note}>{error ?? '±45 for a pair, 0₂ or 0_2 to repeat, ]s to mirror.'}</span>
    </div>
  )
}
