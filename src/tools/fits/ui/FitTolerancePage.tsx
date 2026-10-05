// Fit Tolerance tool: the advisor (ranks ISO fits for an application,
// materials and temperature range) and the calculator (limits and clearances
// of one fit), switched at the top of the inputs column.
//
// "Save revision" saves a snapshot of the calculation to a project through
// the Save-to-Project dialog. "PDF report" opens the printable report of the
// same inputs.
import { useMemo, useState } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { SaveRevisionDialog } from '../../../app/projects/SaveRevisionDialog'
import { useSettings } from '../../../app/settings/settings'
import { ColumnRow } from '../../../app/ui'
import { AdvisorView } from './advisor/AdvisorView'
import { CalculatorView } from './calculator/CalculatorView'
import { fitSnapshot } from './fitSnapshot'
import { fitHref } from './state/urlState'
import { useFitTool } from './state/useFitTool'

export function FitTolerancePage() {
  const { inputs, dispatch, results } = useFitTool()
  const { unitSystem } = useSettings()
  const [saving, setSaving] = useState(false)
  const snapshot = useMemo(() => fitSnapshot(inputs), [inputs])
  const toolActions = {
    onSaveRevision: () => setSaving(true),
    onDownloadReport: () => window.location.assign(fitHref(inputs, 'report', true)),
    // An invalid fit has nothing to save; the screen already explains why.
    saveBlockedReason: snapshot.ok ? undefined : `Nothing to save: ${snapshot.error}`,
  }
  const View = inputs.mode === 'advisor' ? AdvisorView : CalculatorView
  return (
    <AppLayout section="fit" toolActions={toolActions}>
      <ColumnRow>
        <View inputs={inputs} results={results} system={unitSystem} dispatch={dispatch} />
      </ColumnRow>
      {saving && snapshot.ok && <SaveRevisionDialog snapshot={snapshot.value} onClose={() => setSaving(false)} />}
    </AppLayout>
  )
}
