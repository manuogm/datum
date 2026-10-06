// Bolted Joint tool (VDI 2230-1): a single joint, or a bolt pattern of mixed
// joint types under several load cases, switched at the top of the inputs.
//
// The page shows one calculation of the library. "Save" stores the inputs on
// screen; "Report" opens the printable report of the calculation.
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { CalculationActions } from '../../../app/tools/CalculationActions'
import { ColumnRow } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import { PatternView } from './pattern/PatternView'
import { JointView } from './single/JointView'
import { useBoltTool } from './state/useBoltTool'

export function BoltedJointPage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, results, unsaved, save } = useBoltTool(calculation)
  const { unitSystem } = useSettings()
  const View = inputs.mode === 'joint' ? JointView : PatternView
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<CalculationActions calculationId={calculation.id} unsaved={unsaved} onSave={save} />}>
      <ColumnRow>
        <View inputs={inputs} results={results} system={unitSystem} dispatch={dispatch} />
      </ColumnRow>
    </AppLayout>
  )
}
