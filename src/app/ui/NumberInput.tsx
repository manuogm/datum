// NumberInput: a bare number input for use inside an InputWell, as wide as
// its text ("−20 … 140 °C" is two of these). Give it a quantity and unit
// system to show the value in the viewer's units and report it in SI, or
// just decimals for a plain number such as a safety factor (1.50). Keeps
// what the user types until it is a complete number (see useNumberDraft).
import { formatDecimal } from '../../core/units'
import styles from './NumberInput.module.css'
import { useNumberDraft, type DraftInputProps } from './useNumberDraft'
import { useQuantityDraft, type QuantityValueProps } from './useQuantityDraft'

interface PlainValueProps {
  value: number
  onChange: (value: number) => void
  /** Decimals shown when not editing. */
  decimals?: number
  /** Keep trailing zeros (1.50); false shows 45 and 22.5. */
  fixed?: boolean
}

type NumberInputProps = { /** Accessible name, e.g. "Lowest service temperature". */ label: string } & (
  | QuantityValueProps
  | (PlainValueProps & { quantity?: never })
)

export function NumberInput({ label, ...value }: NumberInputProps) {
  return value.quantity === undefined ? <PlainInput label={label} {...value} /> : <QuantityInput label={label} {...value} />
}

function PlainInput({ label, value, onChange, decimals = 2, fixed = true }: PlainValueProps & { label: string }) {
  return <BareInput label={label} draft={useNumberDraft(formatDecimal(value, decimals, fixed), onChange)} />
}

function QuantityInput({ label, ...value }: QuantityValueProps & { label: string }) {
  return <BareInput label={label} draft={useQuantityDraft(value)} />
}

function BareInput({ label, draft }: { label: string; draft: DraftInputProps }) {
  const chars = Math.max(String(draft.value).length, 1)
  return <input className={styles.input} aria-label={label} style={{ width: `${chars}ch` }} {...draft} />
}
