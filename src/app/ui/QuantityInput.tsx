// QuantityInput: a bare number input for use inside an InputWell, as wide as
// its text ("−20 … 140 °C" is two of these). Shows and accepts the value
// in the viewer's unit system and reports it in SI.
import styles from './QuantityInput.module.css'
import { useQuantityDraft, type QuantityValueProps } from './useQuantityDraft'

interface QuantityInputProps extends QuantityValueProps {
  /** Accessible name, e.g. "Lowest service temperature". */
  label: string
}

export function QuantityInput({ label, ...value }: QuantityInputProps) {
  const draft = useQuantityDraft(value)
  const chars = Math.max(String(draft.value).length, 1)
  return <input className={styles.input} aria-label={label} style={{ width: `${chars}ch` }} {...draft} />
}
