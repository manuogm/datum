// QuantityField: a Field for a physical quantity (Ø 25.000 mm). Shows and
// accepts the value in the viewer's unit system and reports it in SI.
import type { ComponentProps } from 'react'
import { unitOf } from '../../core/units'
import { Field } from './Field'
import { useQuantityDraft, type QuantityValueProps } from './useQuantityDraft'

type FieldProps = Omit<ComponentProps<typeof Field>, 'value' | 'onChange' | 'unit' | 'type'>

export function QuantityField({ quantity, system, value, onChange, ...fieldProps }: QuantityValueProps & FieldProps) {
  const draft = useQuantityDraft({ quantity, system, value, onChange })
  return <Field {...fieldProps} {...draft} unit={unitOf(quantity, system)} />
}
