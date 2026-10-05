// Lets a number input keep exactly what the user types while it is not yet a
// complete number ("−", "12."). Each complete number is reported straight
// away; leaving the input shows the stored value formatted again.
import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { parseDecimal } from '../../core/units'

export type DraftInputProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'inputMode'>

/** `shown` is the stored value as formatted text; `onNumber` receives each complete number typed. */
export function useNumberDraft(shown: string, onNumber: (value: number) => void): DraftInputProps {
  const [draft, setDraft] = useState<string | null>(null)
  return {
    value: draft ?? shown,
    inputMode: 'decimal',
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value)
      const typed = parseDecimal(event.target.value)
      if (typed !== null) onNumber(typed)
    },
    onBlur: () => setDraft(null),
  }
}
