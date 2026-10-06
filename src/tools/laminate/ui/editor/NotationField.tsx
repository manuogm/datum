// The stacking notation of the laminate ([0/±45/90]s), typed in full. A
// complete notation replaces the ply angles at once; while it does not parse
// the field keeps what was typed (also after leaving it) and says what the
// reader expected. The typed text is held by the page (see notationDraft),
// which blocks Next until it parses.
import { Field } from '../../../../app/ui'
import { formatLayup } from '../../calc'
import { leaveNotation, notationError, typeNotation, type NotationDraft } from '../logic/notationDraft'
import styles from './editor.module.css'

interface NotationFieldProps {
  anglesDeg: readonly number[]
  /** What is typed, while it differs from the plies' own notation (see liveNotationDraft). */
  draft: NotationDraft | null
  onDraftChange: (draft: NotationDraft | null) => void
  onChange: (anglesDeg: readonly number[]) => void
}

export function NotationField({ anglesDeg, draft, onDraftChange, onChange }: NotationFieldProps) {
  const error = notationError(draft)
  return (
    <div className={styles.notation}>
      <Field
        size="md"
        mono
        prefix="Layup"
        aria-label="Stacking sequence"
        aria-invalid={error ? true : undefined}
        placeholder="[0/±45/90]s"
        tone={error ? 'warn' : 'default'}
        value={draft?.text ?? formatLayup(anglesDeg)}
        onChange={(event) => {
          const typed = typeNotation(event.target.value, anglesDeg)
          onDraftChange(typed.draft)
          if (typed.anglesDeg) onChange(typed.anglesDeg)
        }}
        onBlur={() => onDraftChange(leaveNotation(draft))}
      />
      <span className={error ? styles.warnNote : styles.note}>{error ?? '±45 for a pair, 0₂ or 0_2 to repeat, ]s to mirror.'}</span>
    </div>
  )
}
