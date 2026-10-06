// Composite Laminate tool (classical laminate theory), as guided steps from
// the inputs to the results: Layup · Loads · Check · Results. One step is on
// screen at a time; the step bar goes back to any step reached. The results
// open in depths (verdict, details, calculation), and "Optimise layup" on the
// verdict searches for a lighter layup that meets the target.
//
// The page shows one calculation of the library. "Save" stores the inputs on
// screen; "Report" opens the printable report of the calculation. A new
// calculation opens on its first step, any other on Results (useCalculationSteps).
import { useState } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { CalculationActions } from '../../../app/tools/CalculationActions'
import { useCalculationSteps } from '../../../app/tools/calculationSteps'
import { StepBar } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import { liveNotationDraft, notationError, type NotationDraft } from './logic/notationDraft'
import { lamSteps, stepFault, type LamStepId } from './logic/steps'
import { useLaminateTool } from './state/useLaminateTool'
import { CheckStep } from './steps/CheckStep'
import { LayupStep } from './steps/LayupStep'
import { LoadsStep } from './steps/LoadsStep'
import { ResultsStep } from './steps/ResultsStep'
import type { LamStepProps } from './steps/stepProps'

export function LaminatePage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, analysis, unsaved, save } = useLaminateTool(calculation)
  const { unitSystem: system } = useSettings()
  const fault = stepFault(inputs, analysis)
  // The notation typed on Layup, kept here so it outlives the step; dropped once the plies change another way.
  const [typedNotation, setTypedNotation] = useState<NotationDraft | null>(null)
  const notationDraft = liveNotationDraft(typedNotation, inputs.plies.map((p) => p.angleDeg))
  const steps = lamSteps(fault, notationError(notationDraft))
  const flow = useCalculationSteps(calculation, steps)
  // The ply picked in the ply list, the stack or the failure list; forgotten when the stack gets shorter.
  const [chosenPly, setChosenPly] = useState<number | null>(null)
  const selectedPly = chosenPly !== null && chosenPly <= inputs.plies.length ? chosenPly : null
  const props: LamStepProps = {
    inputs, analysis, dispatch, system, flow, fault, selectedPly, onSelectPly: setChosenPly,
    notationDraft, onNotationDraftChange: setTypedNotation,
  }
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<CalculationActions calculationId={calculation.id} unsaved={unsaved} onSave={save} />}>
      <StepBar steps={steps} {...flow.bar} />
      <CurrentStep id={flow.step.id as LamStepId} props={props} />
    </AppLayout>
  )
}

function CurrentStep({ id, props }: { id: LamStepId; props: LamStepProps }) {
  switch (id) {
    case 'layup':
      return <LayupStep {...props} />
    case 'loads':
      return <LoadsStep {...props} />
    case 'check':
      return <CheckStep {...props} />
    case 'results':
      return <ResultsStep {...props} />
  }
}
