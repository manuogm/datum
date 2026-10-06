// Bolted Joint tool (VDI 2230-1): a single joint, or a bolt pattern of mixed
// joint types under several load cases, chosen on the first step. Either
// mode is a short guided sequence from the inputs to the results, one step
// on screen at a time (see JointSteps and PatternSteps).
//
// The page shows one calculation of the library. "Save" stores the inputs on
// screen; "Report" opens the printable report of the calculation. A new
// calculation opens on its first step, any other on Results
// (useCalculationSteps). The step on screen is remembered while the page is open.
import { useMemo } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { CalculationActions } from '../../../app/tools/CalculationActions'
import { useCalculationSteps } from '../../../app/tools/calculationSteps'
import { StepBar } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import { boltSteps, jointFault, patternFault } from './logic/steps'
import { PatternSteps } from './pattern/PatternSteps'
import { ModeField } from './shared/ModeField'
import { JointSteps } from './single/JointSteps'
import type { BoltMode } from './state/boltInputs'
import { useBoltTool } from './state/useBoltTool'

export function BoltedJointPage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, results, unsaved, save } = useBoltTool(calculation)
  const { unitSystem } = useSettings()
  const fault = useMemo(
    () => (inputs.mode === 'joint' ? jointFault(inputs, results.joint, unitSystem) : patternFault(inputs, results.loadCases, unitSystem)),
    [inputs, results, unitSystem],
  )
  const steps = useMemo(() => boltSteps(inputs.mode, fault), [inputs.mode, fault])
  const flow = useCalculationSteps(calculation, steps)

  // The other mode has its own steps: start them from the first.
  const changeMode = (mode: BoltMode) => {
    if (mode === inputs.mode) return
    dispatch({ type: 'change', changes: { mode } })
    flow.reset()
  }
  const Steps = inputs.mode === 'joint' ? JointSteps : PatternSteps
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<CalculationActions calculationId={calculation.id} unsaved={unsaved} onSave={save} />}>
      <StepBar steps={steps} {...flow.bar} />
      <Steps
        flow={flow}
        inputs={inputs}
        results={results}
        fault={fault}
        system={unitSystem}
        dispatch={dispatch}
        modeField={<ModeField mode={inputs.mode} onChange={changeMode} />}
      />
    </AppLayout>
  )
}
