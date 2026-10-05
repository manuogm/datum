// The requirement rows shared by both modes: a service temperature range, a
// clearance window, and (advisor only) the assembly interference limit. Each
// value is typed in the viewer's units and stored in SI.
import { InputWell, NumberInput, ValueRow } from '../../../../app/ui'
import { unitOf, type Quantity, type UnitSystem } from '../../../../core/units'

interface RangeRowProps {
  label: string
  quantity: Quantity
  system: UnitSystem
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

/** "Service temp.   [−20 … 140 °C]" */
export function RangeRow({ label, quantity, system, min, max, onChange }: RangeRowProps) {
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

interface SingleRowProps {
  label: string
  quantity: Quantity
  system: UnitSystem
  value: number
  onChange: (value: number) => void
}

/** "Max assembly interference   [40 µm]" */
export function SingleRow({ label, quantity, system, value, onChange }: SingleRowProps) {
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
