// QuantityField: a Field for a physical quantity (Ø 25.000 mm). Shows and
// accepts the value in the viewer's unit system and reports it in SI.
import type { ComponentProps } from 'react'
import { unitOf } from '../../core/units'
import { Field } from './Field'
import { useQuantityDraft, type QuantityValueProps } from './useQuantityDraft'

type FieldProps = Omit<ComponentProps<typeof Field>, 'value' | 'onChange' | 'unit' | 'type'>

interface UnitProps {
  /** False when a column head already names the unit, so narrow fields keep their room for the value. */
  showUnit?: boolean
}

export function QuantityField({ quantity, system, value, onChange, showUnit = true, ...fieldProps }: QuantityValueProps & FieldProps & UnitProps) {
  const draft = useQuantityDraft({ quantity, system, value, onChange })
  return <Field mono {...fieldProps} {...draft} unit={showUnit ? unitOf(quantity, system) : undefined} />
}
