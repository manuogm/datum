// The choice between a single joint and a bolt pattern, on the first step of
// either. The mode is an input: it is saved with the calculation.
import { PanelSection, SegmentedControl } from '../../../../app/ui'
import { BOLT_MODES } from '../logic/labels'
import type { BoltMode } from '../state/boltInputs'

interface ModeFieldProps {
  mode: BoltMode
  onChange: (mode: BoltMode) => void
}

export function ModeField({ mode, onChange }: ModeFieldProps) {
  return (
    <PanelSection label="Mode">
      <SegmentedControl label="Mode" options={BOLT_MODES} value={mode} onChange={onChange} size="md" fill markSelected />
    </PanelSection>
  )
}
