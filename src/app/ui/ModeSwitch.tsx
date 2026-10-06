// ModeSwitch: the switch between a tool's modes ("Fit advisor / Calculator",
// "Single joint / Bolt pattern") heading its inputs column.
import { ColumnHeader } from './ColumnHeader'
import { SegmentedControl, type SegmentOption } from './SegmentedControl'

interface ModeSwitchProps<T extends string> {
  modes: readonly SegmentOption<T>[]
  mode: T
  onChange: (mode: T) => void
}

export function ModeSwitch<T extends string>({ modes, mode, onChange }: ModeSwitchProps<T>) {
  return (
    <ColumnHeader>
      <SegmentedControl options={modes} value={mode} onChange={onChange} label="Mode" size="md" fill markSelected />
    </ColumnHeader>
  )
}
