// NumberInput: a bare, unit-less number input for use inside an InputWell
// (a safety factor such as 1.50). The counterpart of QuantityInput for
// plain numbers; keeps what the user types until it is a complete number.
import { formatDecimal } from '../../core/units'
import styles from './QuantityInput.module.css'
import { useNumberDraft } from './useNumberDraft'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  /** Accessible name, e.g. "Minimum safety factor, metallic". */
  label: string
  /** Decimals shown (with trailing zeros) when not editing. */
  decimals?: number
}

export function NumberInput({ value, onChange, label, decimals = 2 }: NumberInputProps) {
  const draft = useNumberDraft(formatDecimal(value, decimals, true), onChange)
  const chars = Math.max(String(draft.value).length, 1)
  return <input className={styles.input} aria-label={label} style={{ width: `${chars}ch` }} {...draft} />
}
