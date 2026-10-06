// The first step's choice of mode: "I know the fit" (the calculator checks
// one fit) or "Help me choose" (the advisor ranks the ISO fits). The steps
// that follow depend on it, so choosing again starts the steps over.
import { PanelSection, SegmentedControl } from '../../../../app/ui'
import type { FitMode } from '../state/fitInputs'
import { FIT_MODES } from './labels'

interface ModeChoiceProps {
  mode: FitMode
  onChange: (mode: FitMode) => void
}

export function ModeChoice({ mode, onChange }: ModeChoiceProps) {
  return (
    <PanelSection label="Mode">
      <SegmentedControl options={FIT_MODES} value={mode} onChange={onChange} label="Mode" size="md" fill markSelected />
    </PanelSection>
  )
}
