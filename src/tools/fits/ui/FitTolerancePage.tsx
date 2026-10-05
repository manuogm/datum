// Fit Tolerance tool: the advisor (ranks ISO fits for an application,
// materials and temperature range) and the calculator (limits and clearances
// of one fit), switched at the top of the inputs column.
//
// "Save revision" builds a snapshot of the calculation and hands it to
// onSaveRevision; the projects module decides where it is stored.
// "PDF report" opens the printable report of the same inputs.
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import type { ToolSnapshot } from '../../../core/projects/revision'
import { AdvisorView } from './advisor/AdvisorView'
import { CalculatorView } from './calculator/CalculatorView'
import { fitSnapshot } from './fitSnapshot'
import styles from './FitTolerancePage.module.css'
import type { FitInputs } from './state/fitInputs'
import { fitHref } from './state/urlState'
import { useFitTool } from './state/useFitTool'

interface FitTolerancePageProps {
  /** Receives the calculation when the engineer clicks "Save revision". */
  onSaveRevision: (snapshot: ToolSnapshot<FitInputs>) => void
}

export function FitTolerancePage({ onSaveRevision }: FitTolerancePageProps) {
  const { inputs, dispatch, results } = useFitTool()
  const { unitSystem } = useSettings()
  const toolActions = {
    // An invalid fit has nothing to save; its explanation is already on screen.
    onSaveRevision: () => {
      const snapshot = fitSnapshot(inputs)
      if (snapshot.ok) onSaveRevision(snapshot.value)
    },
    onDownloadReport: () => window.location.assign(fitHref(inputs, 'report', true)),
  }
  const View = inputs.mode === 'advisor' ? AdvisorView : CalculatorView
  return (
    <AppLayout section="fit" toolActions={toolActions}>
      <div className={styles.page}>
        <View inputs={inputs} results={results} system={unitSystem} dispatch={dispatch} />
      </div>
    </AppLayout>
  )
}
