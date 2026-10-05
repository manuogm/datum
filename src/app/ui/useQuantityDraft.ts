// A number input for a physical quantity: shows the value in the viewer's
// unit system and reports what is typed back in SI (see useNumberDraft).
import { formatQuantity, fromDisplay, type Quantity, type UnitSystem } from '../../core/units'
import { useNumberDraft, type DraftInputProps } from './useNumberDraft'

export interface QuantityValueProps {
  quantity: Quantity
  system: UnitSystem
  /** Stored value, in SI. */
  value: number
  /** Called with the new SI value. */
  onChange: (value: number) => void
}

export function useQuantityDraft({ quantity, system, value, onChange }: QuantityValueProps): DraftInputProps {
  return useNumberDraft(formatQuantity(quantity, system, value), (typed) => onChange(fromDisplay(quantity, system, typed)))
}
