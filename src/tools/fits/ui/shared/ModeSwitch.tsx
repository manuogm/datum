// The "Fit advisor / Calculator" switch at the top of the inputs column.
import { ColumnHeader, SegmentedControl, type SegmentOption } from '../../../../app/ui'
import type { FitMode } from '../state/fitInputs'

const MODES: readonly SegmentOption<FitMode>[] = [
  { value: 'advisor', label: 'Fit advisor' },
  { value: 'calculator', label: 'Calculator' },
]

interface ModeSwitchProps {
  mode: FitMode
  onChange: (mode: FitMode) => void
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <ColumnHeader>
      <SegmentedControl options={MODES} value={mode} onChange={onChange} label="Mode" size="md" fill markSelected />
    </ColumnHeader>
  )
}
