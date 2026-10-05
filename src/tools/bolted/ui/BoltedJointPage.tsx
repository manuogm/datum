// Bolted Joint tool (VDI 2230-1): a single joint, or a bolt pattern of mixed
// joint types under several load cases, switched at the top of the inputs.
//
// "Save revision" saves a snapshot of the joint or pattern to a project
// through the Save-to-Project dialog. "PDF report" opens the printable
// report of the same inputs.
import { useMemo, useState } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { SaveRevisionDialog } from '../../../app/projects/SaveRevisionDialog'
import { useSettings } from '../../../app/settings/settings'
import { ColumnRow } from '../../../app/ui'
import { boltSnapshot } from './boltSnapshot'
import { PatternView } from './pattern/PatternView'
import { JointView } from './single/JointView'
import { boltHref } from './state/urlState'
import { useBoltTool } from './state/useBoltTool'

export function BoltedJointPage() {
  const { inputs, dispatch, results } = useBoltTool()
  const { unitSystem } = useSettings()
  const [saving, setSaving] = useState(false)
  const snapshot = useMemo(() => boltSnapshot(inputs), [inputs])
  const toolActions = {
    onSaveRevision: () => setSaving(true),
    onDownloadReport: () => window.location.assign(boltHref(inputs, 'report', true)),
    // Inputs the engine cannot analyse have nothing to save; the screen already explains why.
    saveBlockedReason: snapshot.ok ? undefined : `Nothing to save: ${snapshot.error}`,
  }
  const View = inputs.mode === 'joint' ? JointView : PatternView
  return (
    <AppLayout section="bolt" toolActions={toolActions}>
      <ColumnRow>
        <View inputs={inputs} results={results} system={unitSystem} dispatch={dispatch} />
      </ColumnRow>
      {saving && snapshot.ok && <SaveRevisionDialog snapshot={snapshot.value} onClose={() => setSaving(false)} />}
    </AppLayout>
  )
}
