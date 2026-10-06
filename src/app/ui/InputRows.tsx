// Labelled rows with a boxed quantity input on the right: a range
// ("Service temp.  [−20 … 140 °C]") or a single value ("Max assembly
// interference  [40 µm]"). Values are typed in the viewer's units and
// reported in SI.
import { unitOf, type Quantity, type UnitSystem } from '../../core/units'
import { InputWell } from './InputWell'
import { NumberInput } from './NumberInput'
import { ValueRow } from './ValueRow'

interface RangeInputRowProps {
  label: string
  quantity: Quantity
  system: UnitSystem
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

/** "Service temp.   [−20 … 140 °C]" */
export function RangeInputRow({ label, quantity, system, min, max, onChange }: RangeInputRowProps) {
  return (
    <ValueRow
      label={label}
      value={
        <InputWell unit={unitOf(quantity, system)}>
          <NumberInput label={`${label}, lowest`} quantity={quantity} system={system} value={min} onChange={(v) => onChange(v, max)} />
          …
          <NumberInput label={`${label}, highest`} quantity={quantity} system={system} value={max} onChange={(v) => onChange(min, v)} />
        </InputWell>
      }
    />
  )
}

interface ValueInputRowProps {
  label: string
  quantity: Quantity
  system: UnitSystem
  value: number
  onChange: (value: number) => void
}

/** "Max assembly interference   [40 µm]" */
export function ValueInputRow({ label, quantity, system, value, onChange }: ValueInputRowProps) {
  return (
    <ValueRow
      label={label}
      value={
        <InputWell unit={unitOf(quantity, system)}>
          <NumberInput label={label} quantity={quantity} system={system} value={value} onChange={onChange} />
        </InputWell>
      }
    />
  )
}
