// Fit Tolerance tool, as guided steps from the inputs to the results. The
// first step chooses the mode, which sets the steps that follow:
//   "I know the fit" (calculator): Size & fit · Service · Results
//   "Help me choose" (advisor):    Application · Size & materials · Requirements · Results
// One step is on screen at a time; the step bar goes back to any step reached.
//
// The page shows one calculation of the library. "Save" stores the inputs on
// screen; "Report" opens the printable report of the calculation. A saved
// calculation opens on its results, a new one on its first step.
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { CalculationActions } from '../../../app/tools/CalculationActions'
import { StepBar, useStepFlow } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import { AdvisorResults } from './advisor/AdvisorResults'
import { ApplicationStep } from './advisor/ApplicationStep'
import { RequirementsStep } from './advisor/RequirementsStep'
import { SizeMaterialsStep } from './advisor/SizeMaterialsStep'
import { CalculatorResults } from './calculator/CalculatorResults'
import { ServiceStep } from './calculator/ServiceStep'
import { SizeFitStep } from './calculator/SizeFitStep'
import { fitSteps, initialStep, stepFault, type FitStepId } from './logic/fitSteps'
import type { FitStepProps } from './shared/stepProps'
import type { FitMode } from './state/fitInputs'
import { useFitTool } from './state/useFitTool'

export function FitTolerancePage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, results, unsaved, save } = useFitTool(calculation)
  const { unitSystem } = useSettings()
  const fault = stepFault(inputs, results)
  const steps = fitSteps(inputs, fault)
  const flow = useStepFlow(steps, { memoryKey: `calc:${calculation.id}`, initial: initialStep(calculation, steps.length) })
  // Another mode has other steps: start them over from the first.
  const changeMode = (mode: FitMode) => {
    dispatch({ type: 'change', changes: { mode } })
    flow.reset()
  }
  const props: FitStepProps = { inputs, results, system: unitSystem, dispatch, flow, fault }
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<CalculationActions calculationId={calculation.id} unsaved={unsaved} onSave={save} />}>
      <StepBar steps={steps} {...flow.bar} />
      <CurrentStep id={flow.step.id as FitStepId} props={props} onModeChange={changeMode} />
    </AppLayout>
  )
}

interface CurrentStepProps {
  id: FitStepId
  props: FitStepProps
  onModeChange: (mode: FitMode) => void
}

function CurrentStep({ id, props, onModeChange }: CurrentStepProps) {
  switch (id) {
    case 'fit':
      return <SizeFitStep {...props} onModeChange={onModeChange} />
    case 'service':
      return <ServiceStep {...props} />
    case 'application':
      return <ApplicationStep {...props} onModeChange={onModeChange} />
    case 'size':
      return <SizeMaterialsStep {...props} />
    case 'requirements':
      return <RequirementsStep {...props} />
    case 'results':
      return props.inputs.mode === 'calculator' ? <CalculatorResults {...props} /> : <AdvisorResults {...props} />
  }
}
