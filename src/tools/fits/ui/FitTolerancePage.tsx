// Fit Tolerance tool: the advisor (ranks ISO fits for an application,
// materials and temperature range) and the calculator (limits and clearances
// of one fit), switched at the top of the inputs column.
//
// The page shows one calculation of the library. "Save" stores the inputs on
// screen; "Report" opens the printable report of the calculation.
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { CalculationActions } from '../../../app/tools/CalculationActions'
import { ColumnRow } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import { AdvisorView } from './advisor/AdvisorView'
import { CalculatorView } from './calculator/CalculatorView'
import { useFitTool } from './state/useFitTool'

export function FitTolerancePage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, results, unsaved, save } = useFitTool(calculation)
  const { unitSystem } = useSettings()
  const View = inputs.mode === 'advisor' ? AdvisorView : CalculatorView
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<CalculationActions calculationId={calculation.id} unsaved={unsaved} onSave={save} />}>
      <ColumnRow>
        <View inputs={inputs} results={results} system={unitSystem} dispatch={dispatch} />
      </ColumnRow>
    </AppLayout>
  )
}
