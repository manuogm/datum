// Advisor, step 2: the nominal size, the housing and shaft materials (their
// expansion moves the clearance with temperature) and how the parts go together.
import { PanelSection, SegmentedControl, StepPage } from '../../../../app/ui'
import { ASSEMBLY_LABELS, ASSEMBLY_METHODS } from '../logic/applications'
import { MaterialPair } from '../shared/MaterialPair'
import { NominalSize } from '../shared/NominalSize'
import { FaultCallout } from '../shared/FaultCallout'
import sharedStyles from '../shared/shared.module.css'
import { nextBlock, type FitStepProps } from '../shared/stepProps'
import type { FitInputs } from '../state/fitInputs'

const ASSEMBLY_OPTIONS = ASSEMBLY_METHODS.map((method) => ({ value: method, label: ASSEMBLY_LABELS[method] }))

export function SizeMaterialsStep({ inputs, results, system, dispatch, flow, fault }: FitStepProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  return (
    <StepPage
      {...flow.page}
      {...nextBlock(fault, 'size')}
      className={sharedStyles.step}
      title="Size and materials"
      hint="The diameter, what the housing and the shaft are made of, and how they are put together."
    >
      <PanelSection label="Size">
        <NominalSize nominalMm={inputs.nominalMm} system={system} onChange={(nominalMm) => change({ nominalMm })} />
      </PanelSection>

      <FaultCallout fault={fault} step="size" title="Outside the sizes ISO 286 covers" />

      <PanelSection label="Materials">
        <MaterialPair
          housing={results.housing}
          shaft={results.shaft}
          system={system}
          onHousingChange={(housingMaterialId) => change({ housingMaterialId })}
          onShaftChange={(shaftMaterialId) => change({ shaftMaterialId })}
        />
      </PanelSection>

      <PanelSection label="Assembly">
        <SegmentedControl label="Assembly" options={ASSEMBLY_OPTIONS} value={inputs.assembly} onChange={(assembly) => change({ assembly })} fill />
      </PanelSection>
    </StepPage>
  )
}
